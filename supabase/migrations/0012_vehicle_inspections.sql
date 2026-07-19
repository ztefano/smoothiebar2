-- Inspección del vehículo antes de iniciar el viaje: estado general,
-- desperfectos por zona (con fotos) y confirmación del cliente.
create table vehicle_inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings (id) on delete cascade,
  driver_id uuid not null references profiles (id) on delete cascade,
  general_status text not null check (general_status in ('ok', 'bad_condition', 'detail')),
  damages jsonb not null default '[]', -- [{zone, types: ["pintura"|"chapa"], photo_url}]
  client_confirmation_name text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table vehicle_inspections enable row level security;

create policy "vehicle_inspections_driver_all" on vehicle_inspections
  for all
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

create policy "vehicle_inspections_client_select" on vehicle_inspections
  for select using (
    exists (
      select 1 from bookings b
      where b.id = vehicle_inspections.booking_id and b.client_id = auth.uid()
    )
  );

create policy "vehicle_inspections_admin_select" on vehicle_inspections
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Fotos de desperfectos: carpeta por reserva (inspection-photos/<booking_id>/...).
insert into storage.buckets (id, name, public)
values ('inspection-photos', 'inspection-photos', true)
on conflict (id) do nothing;

create policy "inspection_photos_public_read" on storage.objects
  for select using (bucket_id = 'inspection-photos');

create policy "inspection_photos_driver_insert" on storage.objects
  for insert with check (
    bucket_id = 'inspection-photos'
    and exists (
      select 1 from bookings b
      where b.id::text = (storage.foldername(name))[1] and b.driver_id = auth.uid()
    )
  );
