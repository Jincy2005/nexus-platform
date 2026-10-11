import Link from "next/link";
import { Composer } from "@/components/feed/composer";
import { PostCard } from "@/components/feed/post-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getFeed } from "@/lib/data/feed";
import { getCurrentProfile } from "@/lib/data/profile";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const mode = (params.mode ?? "for-you") as "for-you" | "following" | "recent" | "professional";
  const { user } = await getCurrentProfile();
  const { posts } = await getFeed({ userId: user?.id ?? null, mode });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          ["for-you", "For you"],
          ["following", "Following"],
          ["recent", "Recent"],
          ["professional", "Professional"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={`/feed?mode=${value}`}
            className={`rounded-full px-3 py-1 ${mode === value ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <Composer />
      {posts.length === 0 ? (
        <EmptyState
          title="Your feed is quiet"
          description="Publish a first post or follow people from Explore and Network."
        />
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} currentUserId={user?.id} />)
      )}
    </div>
  );
}
