import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const user = await getSessionUser().catch(() => null);
  const mode = user ? "update-password" : "reset";
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">
        {mode === "reset" ? "Reset your password" : "Choose a new password"}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {mode === "reset"
          ? "We will email a reset link if an account exists."
          : "You are signed in from a recovery link."}
      </p>
      <AuthForm mode={mode} />
    </div>
  );
}
