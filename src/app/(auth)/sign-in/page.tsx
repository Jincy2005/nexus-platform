import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/env";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; verify?: string }>;
}) {
  const params = await searchParams;
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Welcome back</h1>
      <p className="mb-6 text-sm text-muted-foreground">Sign in to continue to Nexus.</p>
      {params.verify ? (
        <p className="mb-4 text-sm text-primary">
          Check your email to verify your account, then sign in.
        </p>
      ) : null}
      {!isSupabaseConfigured() ? (
        <p className="mb-4 text-sm text-destructive">
          Authentication requires Supabase environment variables. See README.
        </p>
      ) : null}
      <AuthForm mode="sign-in" next={params.next} />
    </div>
  );
}
