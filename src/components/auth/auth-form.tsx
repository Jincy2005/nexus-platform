"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, signUpAction, requestPasswordResetAction, updatePasswordAction } from "@/actions/auth";

type Mode = "sign-in" | "sign-up" | "reset" | "update-password";

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const action =
    mode === "sign-in"
      ? signInAction
      : mode === "sign-up"
        ? signUpAction
        : mode === "reset"
          ? requestPasswordResetAction
          : updatePasswordAction;
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {mode === "sign-up" ? (
        <Field label="Full name" name="fullName" autoComplete="name" />
      ) : null}
      {mode !== "update-password" ? (
        <Field label="Email" name="email" type="email" autoComplete="email" />
      ) : null}
      {mode === "sign-in" || mode === "sign-up" || mode === "update-password" ? (
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        />
      ) : null}
      {mode === "sign-up" || mode === "update-password" ? (
        <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" />
      ) : null}
      {state && "error" in state && state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state && "success" in state && state.success ? (
        <p className="text-sm text-primary">{String(state.success)}</p>
      ) : null}
      <Button className="w-full" disabled={pending}>
        {pending ? "Please wait…" : labelFor(mode)}
      </Button>
      {mode === "sign-in" ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/reset-password">Forgot password?</Link>
          {" · "}
          <Link href="/sign-up">Create an account</Link>
        </p>
      ) : null}
      {mode === "sign-up" ? (
        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} autoComplete={autoComplete} required={name !== "confirmPassword" ? undefined : true} />
    </div>
  );
}

function labelFor(mode: Mode) {
  if (mode === "sign-in") return "Sign in";
  if (mode === "sign-up") return "Create account";
  if (mode === "reset") return "Send reset link";
  return "Update password";
}
