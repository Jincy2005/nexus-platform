create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  full_name text not null default '',
  bio text,
  location text,
  headline text,
  professional_role text,
  website text,
  avatar_path text,
  cover_path text,
  visibility text not null default 'public' check (visibility in ('public', 'connections', 'private')),
  contact_preference text not null default 'connections' check (contact_preference in ('anyone', 'connections', 'nobody')),
  is_onboarded boolean not null default false,
  is_verified boolean not null default false,
  is_admin boolean not null default false,
  is_deactivated boolean not null default false,
  purposes text[] not null default '{}',
  networking_goals text[] not null default '{}',
  interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (
    username is null or username ~ '^[A-Za-z][A-Za-z0-9_]{2,23}$'
  )
);

create unique index profiles_username_lower_idx on public.profiles (lower(username)) where username is not null;
create index profiles_name_trgm_idx on public.profiles using gin (full_name gin_trgm_ops);
create index profiles_username_trgm_idx on public.profiles using gin (username gin_trgm_ops);

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  language text not null default 'en',
  read_receipts boolean not null default true,
  show_online_status boolean not null default true,
  email_notifications boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.user_mutes (
  muter_id uuid not null references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

create or replace function public.users_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

create table public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table public.connections (
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create or replace function public.are_connected(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.connections
    where user_a = least(a, b) and user_b = greatest(a, b)
  );
$$;

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.profile_skills (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, skill_id)
);

create table public.endorsements (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills (id) on delete cascade,
  endorsee_id uuid not null references public.profiles (id) on delete cascade,
  endorser_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (skill_id, endorsee_id, endorser_id),
  check (endorsee_id <> endorser_id)
);

create table public.profile_experience (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  organization text not null,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now()
);

create table public.profile_education (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  school text not null,
  field text,
  degree text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  rules text,
  image_path text,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  category text not null default 'general',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'moderator', 'member')),
  status text not null default 'active' check (status in ('active', 'pending', 'banned')),
  created_at timestamptz not null default now(),
  primary key (community_id, profile_id)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  website text,
  industry text,
  location text,
  logo_path text,
  cover_path text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  type text not null default 'text',
  audience text not null default 'public' check (audience in ('public', 'followers', 'connections', 'private')),
  link_url text,
  topic_tags text[] not null default '{}',
  poll_options text[],
  community_id uuid references public.communities (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  is_pinned boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_author_created_idx on public.posts (author_id, created_at desc);
create index posts_created_idx on public.posts (created_at desc);
create index posts_body_trgm_idx on public.posts using gin (body gin_trgm_ops);
create index posts_tags_idx on public.posts using gin (topic_tags);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_post_idx on public.comments (post_id, created_at);

create table public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, profile_id)
);

create table public.reposts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  quote text,
  created_at timestamptz not null default now(),
  unique (post_id, profile_id)
);

create table public.bookmark_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  collection_id uuid references public.bookmark_collections (id) on delete set null,
  target_type text not null check (target_type in ('post', 'job', 'profile', 'community', 'event', 'project')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (owner_id, target_type, target_id)
);

create table public.poll_votes (
  post_id uuid not null references public.posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  caption text,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create table public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  muted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  deleted_for_everyone boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  follows boolean not null default true,
  connections boolean not null default true,
  likes boolean not null default true,
  comments boolean not null default true,
  messages boolean not null default true,
  jobs boolean not null default true,
  events boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  type text not null,
  entity_type text,
  entity_id uuid,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create unique index notifications_dedupe_idx
  on public.notifications (recipient_id, type, actor_id, entity_id)
  where entity_id is not null and type in ('follow', 'like', 'connection_request');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  title text not null,
  description text not null,
  location text,
  employment_type text not null default 'full_time',
  experience_level text not null default 'mid',
  work_arrangement text not null default 'hybrid',
  skills text[] not null default '{}',
  compensation_min integer,
  compensation_max integer,
  application_deadline date,
  status text not null default 'open' check (status in ('open', 'closed', 'filled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_status_created_idx on public.jobs (status, created_at desc);
create index jobs_title_trgm_idx on public.jobs using gin (title gin_trgm_ops);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  cover_letter text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'rejected', 'accepted', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  title text not null,
  description text,
  format text not null default 'online' check (format in ('online', 'in_person', 'hybrid')),
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'UTC',
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_registrations (
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  needed_skills text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (project_id, requester_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  category text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports (id) on delete set null,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  action text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.hidden_posts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, post_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger posts_updated_at before update on public.posts
  for each row execute procedure public.set_updated_at();

create or replace function public.can_view_post(p public.posts)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not public.users_blocked(p.author_id, auth.uid())
    and (
      p.author_id = auth.uid()
      or (
        p.audience = 'public'
        and exists (
          select 1 from public.profiles pr
          where pr.id = p.author_id
            and pr.is_deactivated = false
            and (pr.visibility = 'public' or pr.id = auth.uid() or (pr.visibility = 'connections' and public.are_connected(pr.id, auth.uid())))
        )
      )
      or (p.audience = 'followers' and exists (
        select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.author_id
      ))
      or (p.audience = 'connections' and public.are_connected(p.author_id, auth.uid()))
    );
$$;

create or replace function public.expire_stories()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.stories where expires_at < now();
$$;

create or replace function public.created_by_owner(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.communities c where c.id = cid and c.created_by = auth.uid());
$$;

create or replace function public.community_has_role(cid uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_members m
    where m.community_id = cid
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role = any(roles)
  );
$$;

create or replace function public.org_has_role(oid uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = oid
      and m.profile_id = auth.uid()
      and m.role = any(roles)
  );
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    raise exception 'Admin status cannot be changed from the client.';
  end if;
  if new.is_verified is distinct from old.is_verified then
    raise exception 'Verification status cannot be changed from the client.';
  end if;
  return new;
end;
$$;

create trigger protect_profile_privileges
  before update on public.profiles
  for each row execute procedure public.protect_profile_privileges();

create or replace function public.notify_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'follows' then
    insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, body)
    values (new.following_id, new.follower_id, 'follow', 'profile', new.follower_id, 'started following you')
    on conflict do nothing;
  elsif tg_table_name = 'post_likes' then
    insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, body)
    select p.author_id, new.profile_id, 'like', 'post', new.post_id, 'liked your post'
    from public.posts p
    where p.id = new.post_id and p.author_id <> new.profile_id
    on conflict do nothing;
  elsif tg_table_name = 'comments' then
    insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, body)
    select p.author_id, new.author_id, 'comment', 'post', new.post_id, 'commented on your post'
    from public.posts p
    where p.id = new.post_id and p.author_id <> new.author_id;
  elsif tg_table_name = 'connection_requests' and new.status = 'pending' then
    insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, body)
    values (new.addressee_id, new.requester_id, 'connection_request', 'connection', new.id, 'sent you a connection request')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger follows_notify after insert on public.follows
  for each row execute procedure public.notify_event();
create trigger likes_notify after insert on public.post_likes
  for each row execute procedure public.notify_event();
create trigger comments_notify after insert on public.comments
  for each row execute procedure public.notify_event();
create trigger connections_notify after insert on public.connection_requests
  for each row execute procedure public.notify_event();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_mutes enable row level security;
alter table public.follows enable row level security;
alter table public.connection_requests enable row level security;
alter table public.connections enable row level security;
alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;
alter table public.endorsements enable row level security;
alter table public.profile_experience enable row level security;
alter table public.profile_education enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.reposts enable row level security;
alter table public.bookmark_collections enable row level security;
alter table public.bookmarks enable row level security;
alter table public.poll_votes enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.projects enable row level security;
alter table public.collaboration_requests enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.hidden_posts enable row level security;

create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or (
      is_deactivated = false
      and not public.users_blocked(id, auth.uid())
      and (
        visibility = 'public'
        or (visibility = 'connections' and public.are_connected(id, auth.uid()))
      )
    )
  );

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "preferences_own" on public.user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "blocks_own" on public.user_blocks
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy "mutes_own" on public.user_mutes
  for all using (muter_id = auth.uid()) with check (muter_id = auth.uid());

create policy "follows_select" on public.follows
  for select using (not public.users_blocked(follower_id, auth.uid()) and not public.users_blocked(following_id, auth.uid()));
create policy "follows_insert" on public.follows
  for insert with check (follower_id = auth.uid() and not public.users_blocked(follower_id, following_id));
create policy "follows_delete" on public.follows
  for delete using (follower_id = auth.uid());

create policy "connection_requests_select" on public.connection_requests
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "connection_requests_insert" on public.connection_requests
  for insert with check (requester_id = auth.uid());
create policy "connection_requests_update" on public.connection_requests
  for update using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "connections_select" on public.connections
  for select using (user_a = auth.uid() or user_b = auth.uid());
create policy "connections_insert" on public.connections
  for insert with check (user_a = auth.uid() or user_b = auth.uid());
create policy "connections_delete" on public.connections
  for delete using (user_a = auth.uid() or user_b = auth.uid());

create policy "skills_read" on public.skills for select using (true);
create policy "skills_insert_auth" on public.skills for insert with check (auth.uid() is not null);

create policy "profile_skills_read" on public.profile_skills for select using (true);
create policy "profile_skills_own" on public.profile_skills
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "endorsements_read" on public.endorsements for select using (true);
create policy "endorsements_insert" on public.endorsements
  for insert with check (endorser_id = auth.uid());
create policy "endorsements_delete" on public.endorsements
  for delete using (endorser_id = auth.uid());

create policy "experience_read" on public.profile_experience for select using (true);
create policy "experience_own" on public.profile_experience
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "education_read" on public.profile_education for select using (true);
create policy "education_own" on public.profile_education
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "communities_select" on public.communities
  for select using (
    visibility = 'public'
    or created_by = auth.uid()
    or exists (
      select 1 from public.community_members m
      where m.community_id = id and m.profile_id = auth.uid() and m.status = 'active'
    )
  );
create policy "communities_insert" on public.communities
  for insert with check (created_by = auth.uid());
create policy "communities_update" on public.communities
  for update using (public.community_has_role(id, array['owner', 'admin']));

create policy "community_members_select" on public.community_members
  for select using (
    profile_id = auth.uid()
    or exists (select 1 from public.communities c where c.id = community_id and c.visibility = 'public')
    or exists (
      select 1 from public.community_members m
      where m.community_id = community_members.community_id and m.profile_id = auth.uid() and m.status = 'active'
    )
  );
create policy "community_members_insert" on public.community_members
  for insert with check (profile_id = auth.uid() or public.created_by_owner(community_id));
create policy "community_members_delete" on public.community_members
  for delete using (profile_id = auth.uid());
create policy "community_members_update" on public.community_members
  for update using (public.community_has_role(community_id, array['owner', 'admin', 'moderator']));

create policy "organizations_select" on public.organizations for select using (true);
create policy "organizations_insert" on public.organizations
  for insert with check (created_by = auth.uid());
create policy "organizations_update" on public.organizations
  for update using (public.org_has_role(id, array['owner', 'admin']));

create policy "org_members_select" on public.organization_members for select using (true);
create policy "org_members_write" on public.organization_members
  for all using (
    public.org_has_role(organization_id, array['owner', 'admin'])
    or profile_id = auth.uid()
  )
  with check (
    public.org_has_role(organization_id, array['owner', 'admin'])
    or profile_id = auth.uid()
  );

create policy "posts_select" on public.posts for select using (public.can_view_post(posts));
create policy "posts_insert" on public.posts for insert with check (author_id = auth.uid());
create policy "posts_update" on public.posts for update using (author_id = auth.uid());
create policy "posts_delete" on public.posts for delete using (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create policy "post_media_select" on public.post_media
  for select using (exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p)));
create policy "post_media_write" on public.post_media
  for all using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

create policy "likes_select" on public.post_likes
  for select using (exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p)));
create policy "likes_insert" on public.post_likes
  for insert with check (profile_id = auth.uid());
create policy "likes_delete" on public.post_likes
  for delete using (profile_id = auth.uid());

create policy "comments_select" on public.comments
  for select using (exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p)));
create policy "comments_insert" on public.comments
  for insert with check (author_id = auth.uid());
create policy "comments_delete" on public.comments
  for delete using (author_id = auth.uid());

create policy "comment_likes_own" on public.comment_likes
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "reposts_select" on public.reposts for select using (true);
create policy "reposts_write" on public.reposts
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "bookmarks_own" on public.bookmarks
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "collections_own" on public.bookmark_collections
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "poll_votes_select" on public.poll_votes
  for select using (exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p)));
create policy "poll_votes_insert" on public.poll_votes
  for insert with check (profile_id = auth.uid());

create policy "stories_select" on public.stories
  for select using (
    author_id = auth.uid()
    or (
      expires_at > now()
      and not public.users_blocked(author_id, auth.uid())
      and (
        exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = author_id)
        or author_id = auth.uid()
      )
    )
  );
create policy "stories_write" on public.stories
  for all using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "story_views_insert" on public.story_views
  for insert with check (viewer_id = auth.uid());
create policy "story_views_select" on public.story_views
  for select using (
    viewer_id = auth.uid()
    or exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid())
  );

create policy "conversation_members_select" on public.conversation_members
  for select using (profile_id = auth.uid() or exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conversation_members.conversation_id and m.profile_id = auth.uid()
  ));
create policy "conversation_members_insert" on public.conversation_members
  for insert with check (profile_id = auth.uid() or exists (
    select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid()
  ));

create policy "conversations_select" on public.conversations
  for select using (exists (
    select 1 from public.conversation_members m
    where m.conversation_id = id and m.profile_id = auth.uid()
  ));
create policy "conversations_insert" on public.conversations
  for insert with check (created_by = auth.uid());

create policy "messages_select" on public.messages
  for select using (exists (
    select 1 from public.conversation_members m
    where m.conversation_id = messages.conversation_id and m.profile_id = auth.uid()
  ));
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members m
      where m.conversation_id = messages.conversation_id and m.profile_id = auth.uid()
    )
  );
create policy "messages_update" on public.messages
  for update using (sender_id = auth.uid());

create policy "message_attachments_member" on public.message_attachments
  for select using (exists (
    select 1 from public.messages msg
    join public.conversation_members m on m.conversation_id = msg.conversation_id
    where msg.id = message_id and m.profile_id = auth.uid()
  ));

create policy "notifications_own" on public.notifications
  for select using (recipient_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update using (recipient_id = auth.uid());
create policy "notification_prefs_own" on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "jobs_select" on public.jobs for select using (status = 'open' or posted_by = auth.uid());
create policy "jobs_insert" on public.jobs for insert with check (posted_by = auth.uid());
create policy "jobs_update" on public.jobs for update using (posted_by = auth.uid());

create policy "applications_select" on public.job_applications
  for select using (
    applicant_id = auth.uid()
    or exists (select 1 from public.jobs j where j.id = job_id and j.posted_by = auth.uid())
  );
create policy "applications_insert" on public.job_applications
  for insert with check (applicant_id = auth.uid());
create policy "applications_update" on public.job_applications
  for update using (
    applicant_id = auth.uid()
    or exists (select 1 from public.jobs j where j.id = job_id and j.posted_by = auth.uid())
  );

create policy "events_select" on public.events for select using (status = 'scheduled' or host_id = auth.uid());
create policy "events_write" on public.events
  for all using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "event_reg_select" on public.event_registrations
  for select using (profile_id = auth.uid() or exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));
create policy "event_reg_write" on public.event_registrations
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "projects_select" on public.projects for select using (true);
create policy "projects_write" on public.projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "collab_select" on public.collaboration_requests
  for select using (
    requester_id = auth.uid()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );
create policy "collab_insert" on public.collaboration_requests
  for insert with check (requester_id = auth.uid());
create policy "collab_update" on public.collaboration_requests
  for update using (
    requester_id = auth.uid()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy "reports_insert" on public.reports
  for insert with check (reporter_id = auth.uid());
create policy "reports_select" on public.reports
  for select using (
    reporter_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
create policy "reports_update_admin" on public.reports
  for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create policy "moderation_admin" on public.moderation_actions
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create policy "hidden_posts_own" on public.hidden_posts
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', false),
  ('covers', 'covers', false),
  ('post-media', 'post-media', false),
  ('message-media', 'message-media', false),
  ('stories', 'stories', false)
on conflict (id) do nothing;

create policy "storage_public_profile_read" on storage.objects
  for select using (
    bucket_id in ('avatars', 'covers')
    and auth.role() = 'authenticated'
  );

create policy "storage_post_media_read" on storage.objects
  for select using (
    bucket_id = 'post-media'
    and auth.role() = 'authenticated'
  );

create policy "storage_own_private_read" on storage.objects
  for select using (
    bucket_id in ('message-media', 'stories')
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "storage_own_folder_insert" on storage.objects
  for insert with check (
    bucket_id in ('avatars', 'covers', 'post-media', 'message-media', 'stories')
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "storage_own_folder_delete" on storage.objects
  for delete using (
    bucket_id in ('avatars', 'covers', 'post-media', 'message-media', 'stories')
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
