"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema, profileUpdateSchema } from "@/lib/validations/auth";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return { supabase, user };
}

function csvToList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function completeOnboardingAction(_prev: unknown, formData: FormData) {
  const parsed = onboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    bio: formData.get("bio") ?? "",
    location: formData.get("location") ?? "",
    professionalRole: formData.get("professionalRole") ?? "",
    headline: formData.get("headline") ?? "",
    interests: csvToList(formData.get("interests")),
    skills: csvToList(formData.get("skills")),
    education: formData.get("education") ?? "",
    work: formData.get("work") ?? "",
    purposes: formData.getAll("purposes"),
    networkingGoals: csvToList(formData.get("networkingGoals")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      username: parsed.data.username.toLowerCase(),
      bio: parsed.data.bio,
      location: parsed.data.location,
      professional_role: parsed.data.professionalRole,
      headline: parsed.data.headline || parsed.data.professionalRole,
      interests: parsed.data.interests,
      purposes: parsed.data.purposes,
      networking_goals: parsed.data.networkingGoals,
      is_onboarded: true,
    })
    .eq("id", user.id);

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { error: "That username is already taken." };
    }
    return { error: error.message };
  }

  for (const skillName of parsed.data.skills) {
    const { data: skill } = await supabase
      .from("skills")
      .upsert({ name: skillName }, { onConflict: "name" })
      .select("id")
      .single();
    if (skill) {
      await supabase.from("profile_skills").upsert({
        profile_id: user.id,
        skill_id: skill.id,
      });
    }
  }

  if (parsed.data.education) {
    await supabase.from("profile_education").insert({
      profile_id: user.id,
      school: parsed.data.education,
    });
  }
  if (parsed.data.work) {
    await supabase.from("profile_experience").insert({
      profile_id: user.id,
      title: parsed.data.professionalRole || "Professional",
      organization: parsed.data.work,
      is_current: true,
    });
  }

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadImage(supabase, user.id, "avatars", photo);
    if ("error" in uploaded) return uploaded;
    await supabase.from("profiles").update({ avatar_path: uploaded.path }).eq("id", user.id);
  }

  redirect("/feed");
}

export async function updateProfileAction(_prev: unknown, formData: FormData) {
  const parsed = profileUpdateSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    bio: formData.get("bio") ?? "",
    location: formData.get("location") ?? "",
    headline: formData.get("headline") ?? "",
    professionalRole: formData.get("professionalRole") ?? "",
    website: formData.get("website") ?? "",
    visibility: formData.get("visibility"),
    contactPreference: formData.get("contactPreference"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      username: parsed.data.username.toLowerCase(),
      bio: parsed.data.bio,
      location: parsed.data.location,
      headline: parsed.data.headline,
      professional_role: parsed.data.professionalRole,
      website: parsed.data.website || null,
      visibility: parsed.data.visibility,
      contact_preference: parsed.data.contactPreference,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath(`/profile/${parsed.data.username.toLowerCase()}`);
  return { success: "Profile updated." };
}

async function uploadImage(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  bucket: "avatars" | "covers",
  file: File,
) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Image must be 5MB or smaller." };
  }
  const ext = file.type.split("/")[1] ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };
  return { path };
}
