create table if not exists public.product_calibrations (
  layout text primary key,
  calibration jsonb not null,
  source text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_calibrations_layout_check check (layout in ('square', 'landscape'))
);

alter table public.product_calibrations enable row level security;

grant select on public.product_calibrations to anon, authenticated;

drop policy if exists "public read product calibrations" on public.product_calibrations;
create policy "public read product calibrations"
  on public.product_calibrations for select
  to anon, authenticated
  using (true);
