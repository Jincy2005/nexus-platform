import type { Metadata } from "next";

export const metadata: Metadata = { title: "Features" };

const groups = [
  ["Identity", "Profiles, onboarding, professional and personal sections, visibility controls."],
  ["Social", "Feed, composer, media, likes, comments, bookmarks, follows."],
  ["Network", "Connections, communities, organizations, search, recommendations."],
  ["Work", "Jobs, applications, events, projects, collaboration requests."],
  ["Trust", "Blocks, reports, admin queue, RLS, rate limits."],
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">What Nexus includes</h1>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {groups.map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-border p-6">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
