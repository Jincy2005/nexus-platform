import { redirect } from "next/navigation";
import { NexusLogo } from "@/components/brand/logo";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getCurrentProfile } from "@/lib/data/profile";
import { isSupabaseConfigured } from "@/lib/env";

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) redirect("/sign-in");
  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/sign-in");
  if (profile?.is_onboarded) redirect("/feed");

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <NexusLogo />
      <h1 className="mt-6 text-3xl font-semibold">Complete your identity</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell Nexus how you want to show up. You can change this later in settings.
      </p>
      <div className="mt-8">
        <OnboardingForm defaultName={profile?.full_name ?? ""} />
      </div>
    </div>
  );
}
