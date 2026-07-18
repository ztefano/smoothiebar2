-- Cuentas admin, vehículos guardados y direcciones guardadas.

alter table profiles add column is_admin boolean not null default false;

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  label text not null, -- "Coche 1", "Coche 2"...
  brand text,
  model text,
  plate text,
  created_at timestamptz not null default now()
);

create table saved_addresses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  label text not null, -- "Casa", "Trabajo", "Playa"...
  address text not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create index vehicles_client_idx on vehicles (client_id);
create index saved_addresses_client_idx on saved_addresses (client_id);

alter table vehicles enable row level security;
alter table saved_addresses enable row level security;

create policy "vehicles_owner_select" on vehicles
  for select using (client_id = auth.uid());
create policy "vehicles_owner_insert" on vehicles
  for insert with check (client_id = auth.uid());
create policy "vehicles_owner_update" on vehicles
  for update using (client_id = auth.uid());
create policy "vehicles_owner_delete" on vehicles
  for delete using (client_id = auth.uid());

create policy "saved_addresses_owner_select" on saved_addresses
  for select using (client_id = auth.uid());
create policy "saved_addresses_owner_insert" on saved_addresses
  for insert with check (client_id = auth.uid());
create policy "saved_addresses_owner_update" on saved_addresses
  for update using (client_id = auth.uid());
create policy "saved_addresses_owner_delete" on saved_addresses
  for delete using (client_id = auth.uid());

-- Cualquier usuario autenticado puede ver si un perfil es admin (necesario
-- para que la Edge Function create-driver-account valide al que la llama).
-- Ya cubierto por la policy "profiles_select_authenticated" existente.
