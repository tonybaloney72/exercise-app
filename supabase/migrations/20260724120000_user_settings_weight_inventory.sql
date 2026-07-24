-- Free-weight inventory (dumbbells, kettlebells, barbell plates, medicine balls).
-- App JSON shape: { dumbbell?: [{ weightLb, count? }], ... } — masses in pounds.

alter table public.user_settings
  add column if not exists weight_inventory jsonb not null
    default '{}'::jsonb;

comment on column public.user_settings.weight_inventory is
  'Owned free-weight denominations by kind (camelCase JSON; weightLb in pounds).';
