-- Vista de solo lectura con los horarios ya reservados (de cualquier
-- cliente), sin exponer direcciones, precios ni otros datos privados.
-- Sirve para mostrar en la app "horarios ya ocupados" a modo de referencia
-- al agendar (no bloquea el horario, solo informa).
create view public.booked_slots as
select scheduled_at
from bookings
where scheduled_at is not null
  and status in ('pending', 'accepted', 'in_progress');

grant select on public.booked_slots to authenticated;
