import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold">Terms of service</h1>
      <p className="mt-4 text-sm text-muted-foreground">Placeholder. Replace before production.</p>
      <p className="mt-4 text-muted-foreground">
        By using Nexus you agree not to abuse the service, harvest personal data, or circumvent access
        controls. Operators may remove content that violates community standards.
      </p>
    </article>
  );
}
