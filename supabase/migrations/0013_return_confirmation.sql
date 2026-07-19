-- Confirmación del cliente al terminar el viaje: que el coche volvió sin
-- daños durante el trayecto (además de la revisión inicial antes de salir).
alter table vehicle_inspections add column return_confirmation_name text;
alter table vehicle_inspections add column return_confirmed_at timestamptz;
