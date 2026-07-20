-- Causa raíz de "nada se actualiza solo, hay que salir y volver a entrar":
-- la app usa canales de Supabase Realtime (postgres_changes) en varias
-- pantallas (Solicitudes del admin, Servicio del chofer, Historial y Viaje
-- del cliente), pero Realtime solo emite cambios de una tabla si esa tabla
-- fue agregada explícitamente a la publicación "supabase_realtime" — algo
-- que ninguna migración anterior hizo. Sin esto, los canales se conectan
-- pero nunca reciben ningún evento, y la única forma de ver datos nuevos
-- era refrescar manualmente.
--
-- Envuelto en bloques que ignoran el error si la tabla ya estaba agregada,
-- para poder correr esta migración las veces que haga falta sin que falle.

do $$
begin
  alter publication supabase_realtime add table bookings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table driver_locations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table payments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table vehicle_inspections;
exception when duplicate_object then null;
end $$;
