import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentProfile, getSignedUrl } from "@/lib/data/profile";
import { Card, CardContent } from "@/components/ui/card";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    redirect("/sign-in");
  }

  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/sign-in");
  if (profile && !profile.is_onboarded) redirect("/onboarding");

  const avatarUrl = await getSignedUrl("avatars", profile?.avatar_path ?? null);

  return (
    <AppShell
      profile={{
        full_name: profile?.full_name ?? "",
        username: profile?.username ?? null,
        avatar_url: avatarUrl,
      }}
      rightRail={
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold">Stay oriented</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Feed ranking is recency + relationship + engagement. Nothing here is billed as
                machine-learning recommendations.
              </p>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
