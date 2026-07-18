-- Esquema inicial para la app de chofer de reemplazo.
-- Ejecutar con: supabase db push (ver docs/SETUP.md)

create type user_role as enum ('client', 'driver');
create type booking_status as enum ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');
create type payment_status as enum ('pending', 'approved', 'rejected');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  role user_role not null,
  is_online boolean not null default false,
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  driver_id uuid references profiles (id) on delete set null,
  status booking_status not null default 'pending',
  pickup_address text not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  dropoff_address text,
  dropoff_lat double precision,
  dropoff_lng double precision,
  scheduled_at timestamptz,
  vehicle_info text not null,
  price_estimate numeric not null,
  created_at timestamptz not null default now()
);

create table driver_locations (
  booking_id uuid primary key references bookings (id) on delete cascade,
  driver_id uuid not null references profiles (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  provider text not null check (provider in ('redsys', 'cash')),
  external_reference text, -- Ds_Order de Redsys; null para pagos en efectivo
  status payment_status not null default 'pending',
  amount numeric not null,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index bookings_status_idx on bookings (status);
create index bookings_client_idx on bookings (client_id);
create index bookings_driver_idx on bookings (driver_id);
create index payments_booking_idx on payments (booking_id);

alter table profiles enable row level security;
alter table bookings enable row level security;
alter table driver_locations enable row level security;
alter table payments enable row level security;

-- profiles: cada usuario ve/edita su propio perfil; cualquiera autenticado
-- puede leer perfiles ajenos (para que el cliente vea el nombre del chofer, etc).
create policy "profiles_select_authenticated" on profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- bookings: el cliente ve/crea/edita solo las suyas.
create policy "bookings_select_own_client" on bookings
  for select using (auth.uid() = client_id);

create policy "bookings_insert_own_client" on bookings
  for insert with check (auth.uid() = client_id);

create policy "bookings_update_own_client" on bookings
  for update using (auth.uid() = client_id);

-- bookings: cualquier chofer autenticado ve las pendientes (para poder
-- aceptarlas) y las que ya tiene asignadas.
create policy "bookings_select_driver" on bookings
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'driver')
    and (status = 'pending' or driver_id = auth.uid())
  );

-- bookings: un chofer solo puede tomar una pendiente (asignándose a sí
-- mismo) o actualizar una que ya es suya.
create policy "bookings_update_driver" on bookings
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'driver')
    and (status = 'pending' or driver_id = auth.uid())
  );

-- driver_locations: visible para el cliente dueño de la reserva y el
-- chofer asignado; solo el chofer asignado puede escribir su posición.
create policy "driver_locations_select" on driver_locations
  for select using (
    driver_id = auth.uid()
    or exists (
      select 1 from bookings b
      where b.id = driver_locations.booking_id and b.client_id = auth.uid()
    )
  );

create policy "driver_locations_upsert" on driver_locations
  for insert with check (driver_id = auth.uid());

create policy "driver_locations_update" on driver_locations
  for update using (driver_id = auth.uid());

-- payments: visibles para el cliente dueño de la reserva y para el chofer
-- asignado (necesita ver/confirmar el cobro en efectivo).
create policy "payments_select_client" on payments
  for select using (
    exists (
      select 1 from bookings b
      where b.id = payments.booking_id and b.client_id = auth.uid()
    )
  );

create policy "payments_select_driver" on payments
  for select using (
    exists (
      select 1 from bookings b
      where b.id = payments.booking_id and b.driver_id = auth.uid()
    )
  );

-- payments: los pagos con Redsys los crea/actualiza la Edge Function con la
-- service role key (nunca desde el cliente). El pago en efectivo sí lo crea
-- el cliente directamente, y solo el chofer asignado puede confirmarlo.
create policy "payments_insert_cash_client" on payments
  for insert with check (
    provider = 'cash'
    and exists (
      select 1 from bookings b
      where b.id = payments.booking_id and b.client_id = auth.uid()
    )
  );

create policy "payments_update_cash_driver" on payments
  for update using (
    provider = 'cash'
    and exists (
      select 1 from bookings b
      where b.id = payments.booking_id and b.driver_id = auth.uid()
    )
  );
