alter table public.image_assets
  add column if not exists cassette_thumb_storage_key text,
  add column if not exists cassette_thumb_url text;

create index if not exists image_assets_cassette_thumb_missing_idx
  on public.image_assets (status, created_at desc)
  where cassette_thumb_url is null;

drop function if exists public.search_public_image_assets(text, boolean, integer, integer);
drop function if exists public.search_public_image_assets(text, boolean, integer, integer, text, text);

create or replace function public.search_public_image_assets(
  p_query text default null,
  p_curated_only boolean default false,
  p_limit integer default 24,
  p_offset integer default 0,
  p_category text default null,
  p_tag text default null,
  p_seed text default null
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
  cassette_thumb_url text,
  dominant_color text,
  blurhash text,
  tags text[],
  categories text[]
)
language sql
stable
as $$
  with params as (
    select
      nullif(trim(p_query), '') as query_text,
      lower(nullif(trim(p_category), '')) as category_text,
      lower(nullif(trim(p_tag), '')) as tag_text,
      coalesce(nullif(trim(p_seed), ''), current_date::text) as seed_text,
      greatest(1, least(coalesce(p_limit, 24), 60)) as result_limit,
      greatest(0, coalesce(p_offset, 0)) as result_offset
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
    image_assets.cassette_thumb_url,
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
      params.category_text is null
      or exists (select 1 from unnest(image_assets.categories) category where lower(category) = params.category_text)
    )
    and (
      params.tag_text is null
      or exists (select 1 from unnest(image_assets.tags) tag where lower(tag) = params.tag_text)
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
    md5(params.seed_text || ':' || image_assets.id::text),
    image_assets.created_at desc
  limit (select result_limit from params)
  offset (select result_offset from params);
$$;

grant execute on function public.search_public_image_assets(text, boolean, integer, integer, text, text, text) to anon, authenticated;
