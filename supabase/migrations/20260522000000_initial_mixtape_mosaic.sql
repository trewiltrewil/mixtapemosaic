create extension if not exists pgcrypto;

create table if not exists public.visitor_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null,
  anonymous_id text,
  path text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.customization_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  selected_size text,
  artwork_source text,
  artwork_name text,
  artwork_url text,
  preview_snapshot_path text,
  state jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.proof_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customization_session_id uuid references public.customization_sessions(id) on delete set null,
  email text not null,
  name text,
  notes text,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  customization_session_id uuid references public.customization_sessions(id) on delete set null,
  email text,
  amount_total integer,
  currency text,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.visitor_events enable row level security;
alter table public.customization_sessions enable row level security;
alter table public.proof_requests enable row level security;
alter table public.orders enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "public insert visitor events" on public.visitor_events;
create policy "public insert visitor events"
  on public.visitor_events for insert
  to anon, authenticated
  with check (true);

drop policy if exists "public insert customization sessions" on public.customization_sessions;
create policy "public insert customization sessions"
  on public.customization_sessions for insert
  to anon, authenticated
  with check (true);

drop policy if exists "public insert proof requests" on public.proof_requests;
create policy "public insert proof requests"
  on public.proof_requests for insert
  to anon, authenticated
  with check (true);

grant usage on schema public to anon, authenticated;
grant insert on public.visitor_events to anon, authenticated;
grant insert on public.customization_sessions to anon, authenticated;
grant insert on public.proof_requests to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('artwork-uploads', 'artwork-uploads', false, 15728640, array['image/jpeg', 'image/png', 'image/webp']),
  ('preview-snapshots', 'preview-snapshots', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
