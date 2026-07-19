-- Configuración de tarifas: tarifa plana + km incluidos, extra por km
-- fuera de esa distancia, y recargo si el punto de recogida cae fuera de
-- la zona de servicio (radio alrededor de un centro, ej. Plaça Catalunya
-- para arrancar en Barcelona). Fila única (singleton).

create table pricing_config (
  id int primary key default 1 check (id = 1),
  flat_fare numeric not null default 50,
  flat_km numeric not null default 15,
  extra_km_price numeric not null default 1.5,
  zone_center_lat double precision not null default 41.3874,
  zone_center_lng double precision not null default 2.1686,
  zone_radius_km numeric not null default 20,
  out_of_zone_km_price numeric not null default 1.5
);

insert into pricing_config (id) values (1);

alter table pricing_config enable row level security;

create policy "pricing_config_select_authenticated" on pricing_config
  for select using (auth.role() = 'authenticated');

create policy "pricing_config_admin_update" on pricing_config
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );
