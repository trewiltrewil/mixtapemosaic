alter table public.image_assets
  add column if not exists search_vector tsvector;

create or replace function public.set_image_assets_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.alt_text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.source_author, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.source_name, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(new.tags, ' ')), 'A') ||
    setweight(to_tsvector('english', array_to_string(new.categories, ' ')), 'A');
  return new;
end;
$$;

drop trigger if exists image_assets_search_vector_trigger on public.image_assets;
create trigger image_assets_search_vector_trigger
  before insert or update of title, description, alt_text, source_author, source_name, tags, categories
  on public.image_assets
  for each row
  execute function public.set_image_assets_search_vector();

update public.image_assets
set title = title
where search_vector is null;

create index if not exists image_assets_search_vector_idx
  on public.image_assets using gin (search_vector);

create or replace function public.search_public_image_assets(
  p_query text default null,
  p_curated_only boolean default false,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  description text,
  alt_text text,
  source_author text,
  source_name text,
  thumb_url text,
  card_url text,
  preview_url text,
  large_url text,
  dominant_color text,
  blurhash text,
  tags text[],
  categories text[]
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select
      nullif(trim(coalesce(p_query, '')), '') as query_text,
      least(greatest(coalesce(p_limit, 24), 1), 48) as safe_limit,
      greatest(coalesce(p_offset, 0), 0) as safe_offset
  )
  select
    image_assets.id,
    image_assets.title,
    image_assets.description,
    image_assets.alt_text,
    image_assets.source_author,
    image_assets.source_name,
    image_assets.thumb_url,
    image_assets.card_url,
    image_assets.preview_url,
    image_assets.large_url,
    image_assets.dominant_color,
    image_assets.blurhash,
    image_assets.tags,
    image_assets.categories
  from public.image_assets, params
  where image_assets.status = 'active'
    and (
      not p_curated_only
      or 'curated' = any(image_assets.tags)
      or 'curated' = any(image_assets.categories)
    )
    and (
      params.query_text is null
      or image_assets.search_vector @@ websearch_to_tsquery('english', params.query_text)
      or image_assets.title ilike '%' || params.query_text || '%'
      or image_assets.description ilike '%' || params.query_text || '%'
      or image_assets.alt_text ilike '%' || params.query_text || '%'
      or image_assets.source_author ilike '%' || params.query_text || '%'
      or image_assets.source_name ilike '%' || params.query_text || '%'
      or exists (select 1 from unnest(image_assets.tags) tag where tag ilike '%' || params.query_text || '%')
      or exists (select 1 from unnest(image_assets.categories) category where category ilike '%' || params.query_text || '%')
    )
  order by
    case
      when params.query_text is null then 0
      else ts_rank_cd(image_assets.search_vector, websearch_to_tsquery('english', params.query_text))
    end desc,
    image_assets.created_at desc
  limit (select safe_limit from params)
  offset (select safe_offset from params);
$$;

grant execute on function public.search_public_image_assets(text, boolean, integer, integer) to anon, authenticated;

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

alter table public.customization_sessions enable row level security;

drop policy if exists "public insert customization sessions" on public.customization_sessions;
create policy "public insert customization sessions"
  on public.customization_sessions for insert
  to anon, authenticated
  with check (true);

grant insert on public.customization_sessions to anon, authenticated;

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
  metadata jsonb not null default '{}'::jsonb,
  constraint customer_artwork_uploads_status_check check (status in ('uploaded', 'linked', 'failed', 'archived'))
);

create index if not exists customer_artwork_uploads_session_idx
  on public.customer_artwork_uploads (customization_session_id);

alter table public.customer_artwork_uploads enable row level security;

alter table public.customization_sessions
  add column if not exists customer_artwork_upload_id uuid references public.customer_artwork_uploads(id) on delete set null;
