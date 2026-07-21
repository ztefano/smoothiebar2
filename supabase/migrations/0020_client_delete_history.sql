-- Permite que el cliente borre su propio historial: solo reservas ya
-- terminadas o canceladas (nunca una en curso). Las tablas relacionadas
-- (payments, driver_locations, vehicle_inspections) se borran en cascada.

create policy "bookings_delete_own_finished" on bookings
  for delete
  using (
    client_id = auth.uid() and status in ('completed', 'cancelled')
  );
