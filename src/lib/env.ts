export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getOAuthProviders() {
  const raw = process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "";
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is "google" | "github" =>
      value === "google" || value === "github",
    );
}

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
