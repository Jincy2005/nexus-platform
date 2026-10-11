import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">About Nexus</h1>
      <p className="mt-4 text-muted-foreground">
        Nexus is a unified networking platform for students, professionals, creators, companies, and
        communities. It is designed as one identity with many contexts—not a collage of disconnected
        clones.
      </p>
      <p className="mt-4 text-muted-foreground">
        The product is intentionally honest about ranking, advertising, and integrations. Features
        that need extra infrastructure are documented instead of simulated.
      </p>
    </article>
  );
}
