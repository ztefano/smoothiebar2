-- El UPDATE de bookings_admin_update funciona, pero el admin.tsx pide de
-- vuelta la fila actualizada (select("client_id")) para poder notificar al
-- cliente por push. Postgres exige que esa fila devuelta también pase las
-- policies de SELECT — y ninguna lo permitía para un admin asignando la
-- reserva a OTRO chofer (bookings_select_driver solo deja ver lo propio).
-- Eso es lo que producía "new row violates row-level security policy for
-- table bookings": el UPDATE en sí se aplicaba bien, pero el RETURNING
-- fallaba. Agregamos una policy de SELECT para el admin, igual que ya
-- existe para UPDATE.

create policy "bookings_select_admin" on bookings
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );
