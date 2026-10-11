"use server";

import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";
import { absoluteUrl } from "@/lib/utils";

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function signUpAction(_prev: unknown, formData: FormData) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Add environment variables first." };
  }
  const parsed = signUpSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const limited = rateLimit(`signup:${parsed.data.email}`, 5, 60_000);
  if (!limited.ok) {
    return { error: `Too many attempts. Try again in ${limited.retryAfterSeconds}s.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: absoluteUrl("/auth/callback"),
    },
  });

  if (error) return { error: error.message };
  redirect("/sign-in?verify=1");
}

export async function signInAction(_prev: unknown, formData: FormData) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Add environment variables first." };
  }
  const parsed = signInSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const limited = rateLimit(`signin:${parsed.data.email}`, 8, 60_000);
  if (!limited.ok) {
    return { error: `Too many attempts. Try again in ${limited.retryAfterSeconds}s.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  const next = String(formData.get("next") ?? "/feed");
  redirect(next.startsWith("/") ? next : "/feed");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(_prev: unknown, formData: FormData) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }
  const parsed = resetRequestSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: absoluteUrl("/auth/callback?next=/reset-password"),
  });
  if (error) return { error: error.message };
  return { success: "If an account exists, a reset email has been sent." };
}

export async function updatePasswordAction(_prev: unknown, formData: FormData) {
  const parsed = updatePasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  redirect("/feed");
}

export async function deactivateAccountAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const { error } = await supabase
    .from("profiles")
    .update({ is_deactivated: true })
    .eq("id", user.id);
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  redirect("/");
}

export async function deleteAccountAction(formData: FormData) {
  const confirmation = String(formData.get("confirmation") ?? "");
  if (confirmation !== "DELETE") {
    return { error: "Type DELETE to confirm account deletion." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return { error: error.message };
  } catch {
    return {
      error:
        "Account deletion requires SUPABASE_SERVICE_ROLE_KEY on the server. See the README.",
    };
  }

  await supabase.auth.signOut();
  redirect("/");
}
