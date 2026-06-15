alter table public.customization_sessions
  add column if not exists artwork_image_asset_id uuid references public.image_assets(id) on delete set null;

alter table public.orders
  add column if not exists artwork_image_asset_id uuid references public.image_assets(id) on delete set null;

create index if not exists customization_sessions_artwork_image_asset_id_idx
  on public.customization_sessions (artwork_image_asset_id);

create index if not exists orders_artwork_image_asset_id_idx
  on public.orders (artwork_image_asset_id);
