-- Tipo de documento del chofer (DNI/NIE/Pasaporte), separado del número
-- (que ya vive en profiles.dni).

alter table profiles
  add column document_type text check (document_type in ('DNI', 'NIE', 'Pasaporte'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, last_name, phone, role, is_online,
    dni, document_type, license_type, address, nationality
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'client'),
    false,
    new.raw_user_meta_data ->> 'dni',
    new.raw_user_meta_data ->> 'document_type',
    new.raw_user_meta_data ->> 'license_type',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'nationality'
  );
  return new;
end;
$$;
