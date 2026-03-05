-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- User profiles (synced from auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

-- Lesson progress per user
create table progress (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  lesson_id text not null,
  completed boolean default false,
  score int,
  attempts int default 1,
  updated_at timestamptz default now(),
  unique(user_id, lesson_id)
);

-- Activity log for admin analytics
create table activity (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  action text not null,
  details jsonb default '{}',
  created_at timestamptz default now()
);

-- Auto-create profile when user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Update last_seen on login
create or replace function handle_user_login()
returns trigger as $$
begin
  update profiles set last_seen = now() where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_login
  after update of last_sign_in_at on auth.users
  for each row execute function handle_user_login();

-- RLS policies
alter table profiles enable row level security;
alter table progress enable row level security;
alter table activity enable row level security;

-- Users can read/update their own profile
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- Users can read/write their own progress
create policy "Users read own progress" on progress for select using (auth.uid() = user_id);
create policy "Users write own progress" on progress for insert with check (auth.uid() = user_id);
create policy "Users update own progress" on progress for update using (auth.uid() = user_id);

-- Users can insert their own activity
create policy "Users write own activity" on activity for insert with check (auth.uid() = user_id);
create policy "Users read own activity" on activity for select using (auth.uid() = user_id);

-- Admin: your email gets full access to everything
-- IMPORTANT: Replace with your actual email
create policy "Admin reads all profiles" on profiles for select using (
  auth.jwt()->>'email' = 'quauhtli.martinez@gmail.com'
);
create policy "Admin reads all progress" on progress for select using (
  auth.jwt()->>'email' = 'quauhtli.martinez@gmail.com'
);
create policy "Admin reads all activity" on activity for select using (
  auth.jwt()->>'email' = 'quauhtli.martinez@gmail.com'
);

-- Indexes
create index idx_progress_user on progress(user_id);
create index idx_activity_user on activity(user_id);
create index idx_activity_created on activity(created_at desc);

-- ─── Shared content pool ──────────────────────────────────────────────────

-- Shared AI-generated lesson content pool
create table lesson_content (
  id bigint generated always as identity primary key,
  lesson_id text not null,
  content jsonb not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Track which content each user has already seen
create table user_content_seen (
  user_id uuid references profiles(id) on delete cascade,
  content_id bigint references lesson_content(id) on delete cascade,
  seen_at timestamptz default now(),
  primary key (user_id, content_id)
);

-- Indexes
create index idx_lesson_content_lesson on lesson_content(lesson_id);
create index idx_user_content_seen_user on user_content_seen(user_id);

-- RLS
alter table lesson_content enable row level security;
alter table user_content_seen enable row level security;

-- Anyone can read lesson content (including anonymous for demo)
create policy "Anon read lesson content" on lesson_content for select using (true);

-- Users can insert content they create
create policy "Users create lesson content" on lesson_content for insert with check (auth.uid() = created_by);
-- Users manage their own seen records
create policy "Users read own seen" on user_content_seen for select using (auth.uid() = user_id);
create policy "Users write own seen" on user_content_seen for insert with check (auth.uid() = user_id);
-- Admin reads all
create policy "Admin reads all lesson_content" on lesson_content for select using (auth.jwt()->>'email' = 'quauhtli.martinez@gmail.com');
create policy "Admin reads all user_content_seen" on user_content_seen for select using (auth.jwt()->>'email' = 'quauhtli.martinez@gmail.com');
