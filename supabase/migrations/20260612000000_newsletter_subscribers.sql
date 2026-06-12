create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'footer',
  status text not null default 'subscribed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  constraint newsletter_subscribers_email_lowercase check (email = lower(email)),
  constraint newsletter_subscribers_status_check check (status in ('subscribed', 'unsubscribed'))
);

create index if not exists newsletter_subscribers_status_created_idx
  on public.newsletter_subscribers (status, created_at desc);

alter table public.newsletter_subscribers enable row level security;

revoke all on public.newsletter_subscribers from anon, authenticated;
