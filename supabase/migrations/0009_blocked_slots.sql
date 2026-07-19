-- Bloqueos manuales de horario hechos por el admin (ej. "tengo poco
-- personal, bloqueo una hora más por las dudas"), sin que exista una
-- reserva real de cliente. Cuentan para el cálculo de capacidad igual que
-- una reserva real: cada bloqueo consume un cupo de chofer activo en ese
-- horario.
create table admin_blocked_slots (
  id uuid primary key default gen_random_uuid(),
  blocked_at timestamptz not null,
  note text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table admin_blocked_slots enable row level security;

create policy "admin_blocked_slots_admin_all" on admin_blocked_slots
  for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- booked_slots (usada por el cliente para calcular horarios disponibles)
-- ahora suma también estos bloqueos manuales.
drop view if exists public.booked_slots;

create view public.booked_slots as
select scheduled_at
from bookings
where scheduled_at is not null
  and status in ('pending', 'accepted', 'in_progress')
union all
select blocked_at as scheduled_at
from admin_blocked_slots;

grant select on public.booked_slots to authenticated;
