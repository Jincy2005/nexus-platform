import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold">Privacy policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">Placeholder. Replace before production.</p>
      <p className="mt-4 text-muted-foreground">
        Nexus stores account, profile, content, and interaction data in your Supabase project. Private
        messages, bookmarks, and job applications are restricted by row-level security. Media is stored
        in private buckets and served with signed URLs.
      </p>
    </article>
  );
}
