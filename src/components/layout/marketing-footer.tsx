import Link from "next/link";
import { NexusLogo } from "@/components/brand/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <NexusLogo />
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/about">About</Link>
          <Link href="/features">Features</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Nexus</p>
      </div>
    </footer>
  );
}
