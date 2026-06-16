alter table public.product_calibrations
  drop constraint if exists product_calibrations_layout_check;

comment on column public.product_calibrations.layout is
  'Stable calibration key from Sanity productVariant.customizerLayoutKey. Existing square/landscape keys remain valid; future product layouts can add keys such as portrait or ten-by-two.';
