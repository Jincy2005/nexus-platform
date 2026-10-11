"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { commentSchema, postSchema, reportSchema } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_MEDIA = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." as const, supabase, user: null };
  return { supabase, user, error: null };
}

export async function createPostAction(_prev: unknown, formData: FormData) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };

  const files = formData.getAll("media").filter((item): item is File => item instanceof File && item.size > 0);
  const parsed = postSchema.safeParse({
    body: formData.get("body") ?? "",
    type: formData.get("type") || (files.length > 1 ? "gallery" : files.length === 1 ? "image" : "text"),
    audience: formData.get("audience") || "public",
    linkUrl: formData.get("linkUrl") || "",
    topicTags: String(formData.get("topicTags") ?? "")
      .split(",")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean),
    pollOptions: formData
      .getAll("pollOptions")
      .map(String)
      .map((option) => option.trim())
      .filter(Boolean),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid post." };
  }
  if (!parsed.data.body && files.length === 0 && !parsed.data.linkUrl && !parsed.data.pollOptions?.length) {
    return { error: "Write something or attach media before publishing." };
  }

  const limited = rateLimit(`post:${auth.user.id}`, 20, 60_000);
  if (!limited.ok) return { error: "You are posting too quickly. Please wait a moment." };

  const { data: post, error } = await auth.supabase
    .from("posts")
    .insert({
      author_id: auth.user.id,
      body: parsed.data.body,
      type: parsed.data.type,
      audience: parsed.data.audience,
      link_url: parsed.data.linkUrl || null,
      topic_tags: parsed.data.topicTags ?? [],
      poll_options: parsed.data.pollOptions?.length ? parsed.data.pollOptions : null,
    })
    .select("id")
    .single();

  if (error || !post) return { error: error?.message ?? "Could not create post." };

  for (const [index, file] of files.entries()) {
    if (!ALLOWED_MEDIA.includes(file.type)) {
      return { error: `Unsupported file type: ${file.type}` };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { error: "Each file must be 25MB or smaller." };
    }
    const ext = file.name.split(".").pop() || "bin";
    const path = `${auth.user.id}/${post.id}/${crypto.randomUUID()}.${ext}`;
    const uploaded = await auth.supabase.storage.from("post-media").upload(path, file, {
      contentType: file.type,
    });
    if (uploaded.error) return { error: uploaded.error.message };
    await auth.supabase.from("post_media").insert({
      post_id: post.id,
      storage_path: path,
      mime_type: file.type,
      alt_text: String(formData.get(`alt-${index}`) ?? "") || null,
      sort_order: index,
    });
  }

  revalidatePath("/feed");
  return { success: true, id: post.id };
}

export async function deletePostAction(postId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const { error } = await auth.supabase.from("posts").delete().eq("id", postId).eq("author_id", auth.user.id);
  if (error) return { error: error.message };
  revalidatePath("/feed");
  return { success: true };
}

export async function toggleLikeAction(postId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };

  const { data: existing } = await auth.supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (existing) {
    await auth.supabase.from("post_likes").delete().eq("post_id", postId).eq("profile_id", auth.user.id);
  } else {
    const { error } = await auth.supabase
      .from("post_likes")
      .insert({ post_id: postId, profile_id: auth.user.id });
    if (error) return { error: error.message };
  }
  revalidatePath("/feed");
  revalidatePath(`/post/${postId}`);
  return { success: true };
}

export async function addCommentAction(_prev: unknown, formData: FormData) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const parsed = commentSchema.safeParse({
    body: formData.get("body"),
    parentId: formData.get("parentId") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid comment." };

  const postId = String(formData.get("postId") ?? "");
  const { error } = await auth.supabase.from("comments").insert({
    post_id: postId,
    author_id: auth.user.id,
    parent_id: parsed.data.parentId,
    body: parsed.data.body,
  });
  if (error) return { error: error.message };
  revalidatePath(`/post/${postId}`);
  return { success: true };
}

export async function toggleFollowAction(targetId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  if (targetId === auth.user.id) return { error: "You cannot follow yourself." };

  const { data: existing } = await auth.supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", auth.user.id)
    .eq("following_id", targetId)
    .maybeSingle();

  if (existing) {
    await auth.supabase
      .from("follows")
      .delete()
      .eq("follower_id", auth.user.id)
      .eq("following_id", targetId);
  } else {
    const { error } = await auth.supabase.from("follows").insert({
      follower_id: auth.user.id,
      following_id: targetId,
    });
    if (error) return { error: error.message };
  }
  revalidatePath("/network");
  return { success: true };
}

export async function toggleBookmarkAction(targetType: string, targetId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };

  const { data: existing } = await auth.supabase
    .from("bookmarks")
    .select("id")
    .eq("owner_id", auth.user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (existing) {
    await auth.supabase.from("bookmarks").delete().eq("id", existing.id).eq("owner_id", auth.user.id);
  } else {
    const { error } = await auth.supabase.from("bookmarks").insert({
      owner_id: auth.user.id,
      target_type: targetType,
      target_id: targetId,
    });
    if (error) return { error: error.message };
  }
  revalidatePath("/bookmarks");
  return { success: true };
}

export async function requestConnectionAction(addresseeId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const { error } = await auth.supabase.from("connection_requests").insert({
    requester_id: auth.user.id,
    addressee_id: addresseeId,
    status: "pending",
  });
  if (error) return { error: error.message };
  revalidatePath("/network");
  return { success: true };
}

export async function respondConnectionAction(requestId: string, accept: boolean) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };

  const { data: request, error } = await auth.supabase
    .from("connection_requests")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", requestId)
    .eq("addressee_id", auth.user.id)
    .select("requester_id, addressee_id")
    .single();

  if (error || !request) return { error: error?.message ?? "Request not found." };

  if (accept) {
    const [a, b] = [request.requester_id, request.addressee_id].sort();
    await auth.supabase.from("connections").upsert({ user_a: a, user_b: b });
  }
  revalidatePath("/network");
  return { success: true };
}

export async function blockUserAction(targetId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const { error } = await auth.supabase.from("user_blocks").insert({
    blocker_id: auth.user.id,
    blocked_id: targetId,
  });
  if (error) return { error: error.message };
  await auth.supabase.from("follows").delete().or(
    `and(follower_id.eq.${auth.user.id},following_id.eq.${targetId}),and(follower_id.eq.${targetId},following_id.eq.${auth.user.id})`,
  );
  return { success: true };
}

export async function reportAction(_prev: unknown, formData: FormData) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const parsed = reportSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    category: formData.get("category"),
    details: formData.get("details") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid report." };

  const { error } = await auth.supabase.from("reports").insert({
    reporter_id: auth.user.id,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    category: parsed.data.category,
    details: parsed.data.details,
  });
  if (error) return { error: error.message };
  return { success: "Report submitted. Thank you." };
}

export async function createCommunityAction(_prev: unknown, formData: FormData) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public");
  const category = String(formData.get("category") ?? "general");
  if (name.length < 3) return { error: "Community name is too short." };
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  const { data, error } = await auth.supabase
    .from("communities")
    .insert({
      name,
      slug,
      description,
      visibility,
      category,
      created_by: auth.user.id,
    })
    .select("slug")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create community." };

  const { data: created } = await auth.supabase
    .from("communities")
    .select("id, slug")
    .eq("slug", data.slug)
    .single();
  if (created) {
    await auth.supabase.from("community_members").insert({
      community_id: created.id,
      profile_id: auth.user.id,
      role: "owner",
      status: "active",
    });
  }
  revalidatePath("/communities");
  return { success: true, slug: created?.slug ?? data.slug };
}

export async function joinCommunityAction(communityId: string, visibility: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const { error } = await auth.supabase.from("community_members").insert({
    community_id: communityId,
    profile_id: auth.user.id,
    role: "member",
    status: visibility === "private" ? "pending" : "active",
  });
  if (error) return { error: error.message };
  revalidatePath("/communities");
  return { success: true };
}

export async function sendMessageAction(_prev: unknown, formData: FormData) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Message cannot be empty." };

  const { data: member } = await auth.supabase
    .from("conversation_members")
    .select("profile_id")
    .eq("conversation_id", conversationId)
    .eq("profile_id", auth.user.id)
    .maybeSingle();
  if (!member) return { error: "You are not a participant in this conversation." };

  const { error } = await auth.supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: auth.user.id,
    body,
  });
  if (error) return { error: error.message };
  await auth.supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  revalidatePath("/messages");
  return { success: true };
}

export async function startConversationAction(targetId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };

  const { data: existing } = await auth.supabase
    .from("conversation_members")
    .select("conversation_id, conversations!inner(is_group)")
    .eq("profile_id", auth.user.id);

  // Create a new 1:1 conversation. Duplicate detection is best-effort.
  const { data: conversation, error } = await auth.supabase
    .from("conversations")
    .insert({ is_group: false, created_by: auth.user.id })
    .select("id")
    .single();
  if (error || !conversation) return { error: error?.message ?? "Could not start conversation." };

  await auth.supabase.from("conversation_members").insert([
    { conversation_id: conversation.id, profile_id: auth.user.id },
    { conversation_id: conversation.id, profile_id: targetId },
  ]);
  void existing;
  return { success: true, id: conversation.id };
}

export async function createJobAction(_prev: unknown, formData: FormData) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (title.length < 3 || description.length < 20) {
    return { error: "Provide a title and a description of at least 20 characters." };
  }
  const { error, data } = await auth.supabase
    .from("jobs")
    .insert({
      posted_by: auth.user.id,
      title,
      description,
      location: String(formData.get("location") ?? "") || null,
      employment_type: String(formData.get("employmentType") ?? "full_time"),
      experience_level: String(formData.get("experienceLevel") ?? "mid"),
      work_arrangement: String(formData.get("workArrangement") ?? "hybrid"),
      skills: String(formData.get("skills") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/jobs");
  return { success: true, id: data.id };
}

export async function applyToJobAction(_prev: unknown, formData: FormData) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const jobId = String(formData.get("jobId") ?? "");
  const coverLetter = String(formData.get("coverLetter") ?? "").trim();
  const { error } = await auth.supabase.from("job_applications").insert({
    job_id: jobId,
    applicant_id: auth.user.id,
    cover_letter: coverLetter,
  });
  if (error) return { error: error.message };
  revalidatePath(`/job/${jobId}`);
  return { success: true };
}

export async function createEventAction(_prev: unknown, formData: FormData) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "");
  if (!title || !startsAt) return { error: "Title and start time are required." };
  const { data, error } = await auth.supabase
    .from("events")
    .insert({
      host_id: auth.user.id,
      title,
      description: String(formData.get("description") ?? ""),
      format: String(formData.get("format") ?? "online"),
      location: String(formData.get("location") ?? "") || null,
      starts_at: new Date(startsAt).toISOString(),
      timezone: String(formData.get("timezone") ?? "UTC"),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/events");
  return { success: true, id: data.id };
}

export async function registerForEventAction(eventId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const { error } = await auth.supabase.from("event_registrations").insert({
    event_id: eventId,
    profile_id: auth.user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/event/${eventId}`);
  return { success: true };
}

export async function createProjectAction(_prev: unknown, formData: FormData) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3) return { error: "Enter a project title." };
  const { data, error } = await auth.supabase
    .from("projects")
    .insert({
      owner_id: auth.user.id,
      title,
      description: String(formData.get("description") ?? ""),
      needed_skills: String(formData.get("neededSkills") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/projects");
  return { success: true, id: data.id };
}

export async function requestCollaborationAction(projectId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const { error } = await auth.supabase.from("collaboration_requests").insert({
    project_id: projectId,
    requester_id: auth.user.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/projects");
  return { success: true };
}

export async function createOrganizationAction(_prev: unknown, formData: FormData) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter an organization name." };
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const { data, error } = await auth.supabase
    .from("organizations")
    .insert({
      name,
      slug,
      description: String(formData.get("description") ?? ""),
      industry: String(formData.get("industry") ?? ""),
      website: String(formData.get("website") ?? "") || null,
      created_by: auth.user.id,
    })
    .select("id, slug")
    .single();
  if (error) return { error: error.message };
  await auth.supabase.from("organization_members").insert({
    organization_id: data.id,
    profile_id: auth.user.id,
    role: "owner",
  });
  revalidatePath("/organizations");
  return { success: true, slug: data.slug };
}

export async function markNotificationsReadAction() {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };
  await auth.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", auth.user.id)
    .is("read_at", null);
  revalidatePath("/notifications");
  return { success: true };
}
