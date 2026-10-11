import { createClient } from "@/lib/supabase/server";
import { feedScore } from "@/lib/visibility";
import type { FeedPost } from "@/types/database";

export async function getFeed(options: {
  userId: string | null;
  mode?: "for-you" | "following" | "recent" | "professional";
  cursor?: string;
  limit?: number;
}) {
  const supabase = await createClient();
  const limit = options.limit ?? 20;

  let query = supabase
    .from("posts")
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey (id, username, full_name, avatar_path, headline, is_verified),
      post_likes (profile_id),
      comments (id),
      post_media (*),
      bookmarks (owner_id)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(80);

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }
  if (options.mode === "professional") {
    query = query.in("type", ["professional_update", "project", "job", "question"]);
  }

  const { data, error } = await query;
  if (error || !data) return { posts: [] as FeedPost[], error: error?.message };

  const followingIds = new Set<string>();
  const connectionIds = new Set<string>();
  if (options.userId) {
    const [{ data: follows }, { data: connections }] = await Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", options.userId),
      supabase.from("connections").select("user_a, user_b").or(`user_a.eq.${options.userId},user_b.eq.${options.userId}`),
    ]);
    follows?.forEach((row) => followingIds.add(row.following_id));
    connections?.forEach((row) => {
      connectionIds.add(row.user_a === options.userId ? row.user_b : row.user_a);
    });
  }

  const mapped = (data as unknown as Record<string, unknown>[]).map((row) => {
    const likes = (row.post_likes as { profile_id: string }[] | null) ?? [];
    const comments = (row.comments as { id: string }[] | null) ?? [];
    const bookmarks = (row.bookmarks as { owner_id: string }[] | null) ?? [];
    const authorId = row.author_id as string;
    return {
      ...(row as object),
      author: row.author,
      like_count: likes.length,
      comment_count: comments.length,
      liked_by_me: options.userId ? likes.some((like) => like.profile_id === options.userId) : false,
      bookmarked_by_me: options.userId
        ? bookmarks.some((bookmark) => bookmark.owner_id === options.userId)
        : false,
      media: row.post_media ?? [],
      _following: followingIds.has(authorId),
      _connected: connectionIds.has(authorId),
    } as FeedPost & { _following: boolean; _connected: boolean; created_at: string };
  });

  const filtered = mapped.filter((post) => {
    if (options.mode === "following") return post._following;
    return true;
  });

  const ranked =
    options.mode === "recent"
      ? filtered
      : [...filtered].sort((a, b) => {
          return (
            feedScore({
              createdAt: new Date(b.created_at),
              likeCount: b.like_count,
              commentCount: b.comment_count,
              isFollowing: b._following,
              isConnection: b._connected,
            }) -
            feedScore({
              createdAt: new Date(a.created_at),
              likeCount: a.like_count,
              commentCount: a.comment_count,
              isFollowing: a._following,
              isConnection: a._connected,
            })
          );
        });

  return { posts: ranked.slice(0, limit), error: undefined };
}
