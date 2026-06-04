create table if not exists public.image_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  alt_text text,
  source_type text not null default 'manual_upload',
  source_name text,
  source_url text,
  source_author text,
  source_license text,
  source_downloaded_at timestamptz,
  original_storage_key text not null,
  original_filename text not null,
  original_content_type text not null,
  original_width integer,
  original_height integer,
  original_size_bytes bigint,
  thumb_storage_key text,
  card_storage_key text,
  preview_storage_key text,
  large_storage_key text,
  thumb_url text,
  card_url text,
  preview_url text,
  large_url text,
  dominant_color text,
  blurhash text,
  tags text[] not null default '{}'::text[],
  categories text[] not null default '{}'::text[],
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  constraint image_assets_status_check check (status in ('draft', 'active', 'archived', 'processing', 'failed'))
);

create index if not exists image_assets_status_created_idx
  on public.image_assets (status, created_at desc);

create index if not exists image_assets_tags_idx
  on public.image_assets using gin (tags);

create index if not exists image_assets_categories_idx
  on public.image_assets using gin (categories);

alter table public.image_assets enable row level security;

drop policy if exists "public read active image assets" on public.image_assets;
create policy "public read active image assets"
  on public.image_assets for select
  to anon, authenticated
  using (status = 'active');

grant select on public.image_assets to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'image-originals',
    'image-originals',
    false,
    104857600,
    array['image/jpeg', 'image/png', 'image/webp', 'image/tiff']
  ),
  (
    'image-derivatives',
    'image-derivatives',
    true,
    15728640,
    array['image/webp']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read image derivatives" on storage.objects;
create policy "public read image derivatives"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'image-derivatives');

