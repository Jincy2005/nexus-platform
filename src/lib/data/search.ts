import { createClient } from "@/lib/supabase/server";

export async function searchAll(query: string) {
  const q = query.trim();
  if (q.length < 2) {
    return { people: [], posts: [], communities: [], jobs: [], events: [], organizations: [] };
  }
  const supabase = await createClient();
  const like = `%${q}%`;

  const [people, posts, communities, jobs, events, organizations] = await Promise.all([
    supabase.from("profiles").select("id, username, full_name, headline").ilike("full_name", like).limit(8),
    supabase.from("posts").select("id, body, created_at").ilike("body", like).limit(8),
    supabase.from("communities").select("id, slug, name, description").ilike("name", like).limit(8),
    supabase.from("jobs").select("id, title, location").ilike("title", like).eq("status", "open").limit(8),
    supabase.from("events").select("id, title, starts_at").ilike("title", like).limit(8),
    supabase.from("organizations").select("id, slug, name").ilike("name", like).limit(8),
  ]);

  return {
    people: people.data ?? [],
    posts: posts.data ?? [],
    communities: communities.data ?? [],
    jobs: jobs.data ?? [],
    events: events.data ?? [],
    organizations: organizations.data ?? [],
  };
}
