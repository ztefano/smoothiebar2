-- Panel de administración: horarios de la empresa por día de semana,
-- estado activo/inactivo de los choferes (lo controla el admin, distinto
-- de is_online que lo controla el propio chofer) y datos extendidos del
-- chofer (documento, carnet, dirección, nacionalidad).

alter table profiles add column is_active boolean not null default true;
alter table profiles add column dni text;
alter table profiles add column license_type text;
alter table profiles add column address text;
alter table profiles add column nationality text;

create table business_hours (
  day_of_week int primary key check (day_of_week between 0 and 6), -- 0=domingo ... 6=sábado
  is_open boolean not null default false,
  open_time time not null default '09:00',
  close_time time not null default '18:00'
);

insert into business_hours (day_of_week)
select generate_series(0, 6);

alter table business_hours enable row level security;

create policy "business_hours_select_authenticated" on business_hours
  for select using (auth.role() = 'authenticated');

create policy "business_hours_admin_update" on business_hours
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

-- El admin puede activar/desactivar choferes y editar sus datos desde la
-- app (además de "profiles_update_own", que sigue permitiendo que cada
-- quien edite su propio perfil).
create policy "profiles_admin_update_any" on profiles
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, last_name, phone, role, is_online,
    dni, license_type, address, nationality
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'client'),
    false,
    new.raw_user_meta_data ->> 'dni',
    new.raw_user_meta_data ->> 'license_type',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'nationality'
  );
  return new;
end;
$$;
