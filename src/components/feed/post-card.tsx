"use client";

import Link from "next/link";
import { Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";
import { toggleBookmarkAction, toggleLikeAction, deletePostAction } from "@/actions/social";
import { Avatar } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/utils";
import type { FeedPost } from "@/types/database";
import { useRouter } from "next/navigation";

export function PostCard({
  post,
  currentUserId,
}: {
  post: FeedPost;
  currentUserId?: string;
}) {
  const router = useRouter();
  const authorName = post.author?.full_name ?? "Member";
  const username = post.author?.username;

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <Link href={username ? `/profile/${username}` : "#"}>
          <Avatar name={authorName} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href={username ? `/profile/${username}` : "#"} className="font-medium">
              {authorName}
            </Link>
            {username ? <span className="text-muted-foreground">@{username}</span> : null}
            <span className="text-muted-foreground">{timeAgo(post.created_at)}</span>
            {post.edited_at ? <span className="text-xs text-muted-foreground">edited</span> : null}
          </div>
          {post.author?.headline ? (
            <p className="text-xs text-muted-foreground">{post.author.headline}</p>
          ) : null}
          <Link href={`/post/${post.id}`} className="mt-3 block whitespace-pre-wrap text-sm">
            {post.body}
          </Link>
          {post.link_url ? (
            <a href={post.link_url} className="mt-2 block text-sm text-primary underline" rel="noreferrer">
              {post.link_url}
            </a>
          ) : null}
          {post.poll_options?.length ? (
            <ul className="mt-3 space-y-2">
              {post.poll_options.map((option) => (
                <li key={option} className="rounded-xl border border-border px-3 py-2 text-sm">
                  {option}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex items-center gap-2">
            <form
              action={async () => {
                await toggleLikeAction(post.id);
                router.refresh();
              }}
            >
              <button type="submit" className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm hover:bg-muted">
                <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-primary text-primary" : ""}`} />
                {post.like_count}
              </button>
            </form>
            <Link href={`/post/${post.id}`} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm hover:bg-muted">
              <MessageCircle className="h-4 w-4" />
              {post.comment_count}
            </Link>
            <form
              action={async () => {
                await toggleBookmarkAction("post", post.id);
                router.refresh();
              }}
            >
              <button type="submit" className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm hover:bg-muted">
                <Bookmark className={`h-4 w-4 ${post.bookmarked_by_me ? "fill-foreground" : ""}`} />
              </button>
            </form>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm hover:bg-muted"
              onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
              }}
            >
              <Share2 className="h-4 w-4" />
            </button>
            {currentUserId === post.author_id ? (
              <form
                action={async () => {
                  await deletePostAction(post.id);
                  router.refresh();
                }}
              >
                <button type="submit" className="text-xs text-destructive">
                  Delete
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
