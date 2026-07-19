-- Confirmación de la inspección desde el propio dispositivo del cliente
-- (en vez de teclear en el teléfono del chofer), con geolocalización de
-- quien confirma, y un flujo de disconformidad al finalizar (con
-- observaciones y fotos) para poder contrastarlo contra el reporte de
-- salida si el cliente reclama un daño.

alter table vehicle_inspections
  add column start_confirmation_method text check (start_confirmation_method in ('client_device', 'driver_device')),
  add column start_lat double precision,
  add column start_lng double precision,
  add column return_requested_at timestamptz,
  add column return_status text check (return_status in ('conforme', 'disputed', 'refused')),
  add column return_note text,
  add column return_damages jsonb not null default '[]',
  add column return_confirmation_method text check (return_confirmation_method in ('client_device', 'driver_device')),
  add column return_lat double precision,
  add column return_lng double precision;

-- El cliente necesita poder confirmar (actualizar) la fila de su propia
-- reserva — hasta ahora solo podía leerla.
create policy "vehicle_inspections_client_update" on vehicle_inspections
  for update
  using (
    exists (select 1 from bookings b where b.id = vehicle_inspections.booking_id and b.client_id = auth.uid())
  )
  with check (
    exists (select 1 from bookings b where b.id = vehicle_inspections.booking_id and b.client_id = auth.uid())
  );

-- Una vez confirmado (por cualquiera de los dos lados), ese tramo del
-- reporte queda inmutable a nivel de base de datos — ni el chofer ni el
-- cliente pueden reescribir la historia después.
create or replace function public.lock_confirmed_inspection()
returns trigger
language plpgsql
as $$
begin
  if old.confirmed_at is not null and (
    new.general_status is distinct from old.general_status or
    new.damages is distinct from old.damages or
    new.client_confirmation_name is distinct from old.client_confirmation_name
  ) then
    raise exception 'No se puede modificar la inspección de salida después de confirmada.';
  end if;

  if old.return_confirmed_at is not null and (
    new.return_status is distinct from old.return_status or
    new.return_damages is distinct from old.return_damages or
    new.return_note is distinct from old.return_note or
    new.return_confirmation_name is distinct from old.return_confirmation_name
  ) then
    raise exception 'No se puede modificar la inspección de vuelta después de confirmada.';
  end if;

  return new;
end;
$$;

create trigger vehicle_inspections_lock
  before update on vehicle_inspections
  for each row execute function public.lock_confirmed_inspection();
