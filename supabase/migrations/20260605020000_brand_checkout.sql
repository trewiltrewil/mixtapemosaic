create table if not exists public.brands (
  id text primary key,
  name text not null,
  domain text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.brands (id, name, domain)
values ('mixtape_mosaic', 'Mixtape Mosaic', 'mixtapemosaic.com')
on conflict (id) do update set
  name = excluded.name,
  domain = excluded.domain,
  updated_at = now();

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  brand_id text not null references public.brands(id),
  email text not null,
  stripe_customer_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_brand_email_idx
  on public.customers (brand_id, email);

create unique index if not exists customers_stripe_customer_id_idx
  on public.customers (stripe_customer_id);

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

create table if not exists public.customer_artwork_uploads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customization_session_id uuid references public.customization_sessions(id) on delete set null,
  original_storage_key text not null unique,
  original_filename text not null,
  original_content_type text not null,
  original_width integer,
  original_height integer,
  original_size_bytes bigint,
  status text not null default 'uploaded',
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

alter table public.orders
  add column if not exists brand_id text references public.brands(id) default 'mixtape_mosaic',
  add column if not exists stripe_customer_id text,
  add column if not exists customer_artwork_upload_id uuid references public.customer_artwork_uploads(id) on delete set null,
  add column if not exists preview_snapshot_key text,
  add column if not exists shipping_address jsonb not null default '{}'::jsonb,
  add column if not exists failure_message text;

alter table public.orders alter column brand_id set default 'mixtape_mosaic';

update public.orders
set brand_id = 'mixtape_mosaic'
where brand_id is null;

create unique index if not exists orders_stripe_payment_intent_id_idx
  on public.orders (stripe_payment_intent_id);

alter table public.brands enable row level security;
alter table public.customers enable row level security;
alter table public.customization_sessions enable row level security;
alter table public.customer_artwork_uploads enable row level security;
alter table public.orders enable row level security;

grant select on public.brands to anon, authenticated;

drop policy if exists "public read brands" on public.brands;
create policy "public read brands"
  on public.brands for select
  to anon, authenticated
  using (true);
