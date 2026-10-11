import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function SignUpPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Create your Nexus identity</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Use email and password. OAuth providers can be enabled in Supabase when configured.
      </p>
      {!isSupabaseConfigured() ? (
        <p className="mb-4 text-sm text-destructive">
          Authentication requires Supabase environment variables. See README.
        </p>
      ) : null}
      <AuthForm mode="sign-up" />
    </div>
  );
}
