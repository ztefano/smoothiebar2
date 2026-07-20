-- El admin acepta/cancela una reserva pendiente y asigna un chofer
-- específico (no necesariamente él mismo), algo que la policy existente
-- "bookings_update_driver" no permite (esa solo deja que un chofer se
-- autoasigne a sí mismo). Igual que "profiles_admin_update_any".

create policy "bookings_admin_update" on bookings
  for update
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );
