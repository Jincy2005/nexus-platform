"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  Briefcase,
  Calendar,
  Compass,
  FolderGit2,
  Home,
  MessageCircle,
  Search,
  Settings,
  Users,
  Building2,
} from "lucide-react";
import { NexusLogo, NexusMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

const nav = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/network", label: "Network", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/communities", label: "Communities", icon: Search },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/bookmarks", label: "Saved", icon: Bookmark },
  { href: "/settings", label: "Settings", icon: Settings },
];

const mobile = nav.slice(0, 5);

export function AppShell({
  children,
  rightRail,
  profile,
}: {
  children: React.ReactNode;
  rightRail?: React.ReactNode;
  profile: { full_name: string; username: string | null; avatar_url?: string | null };
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-full max-w-7xl">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border p-4 md:flex">
        <Link href="/feed" className="mb-6">
          <NexusLogo />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-full px-3 py-2 text-sm hover:bg-muted",
                pathname.startsWith(item.href) && "bg-muted font-medium",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between pt-4">
          <Link href={profile.username ? `/profile/${profile.username}` : "/onboarding"} className="flex items-center gap-2">
            <Avatar name={profile.full_name} src={profile.avatar_url} />
            <span className="max-w-28 truncate text-sm">{profile.full_name || "Complete profile"}</span>
          </Link>
          <form action={signOutAction}>
            <Button variant="ghost" size="sm">
              Out
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <NexusMark className="h-7 w-7" />
          <ThemeToggle />
        </header>
        <div className="flex flex-1 gap-6 px-4 py-4 pb-24 md:pb-6">
          <div className="min-w-0 flex-1">{children}</div>
          {rightRail ? (
            <aside className="sticky top-4 hidden h-fit w-80 shrink-0 lg:block">{rightRail}</aside>
          ) : null}
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background md:hidden">
        {mobile.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[11px]",
              pathname.startsWith(item.href) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
