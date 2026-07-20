-- Diagnóstico: al crear un chofer de prueba, no apareció NINGUNA fila en
-- profiles (ni siquiera con role incorrecto) — o sea que el trigger
-- "on_auth_user_created" (creado en la migración 0002) nunca llegó a
-- instalarse en este proyecto, probablemente porque esa migración no se
-- corrió. Esto afecta a CUALQUIER registro nuevo, no solo choferes: un
-- cliente que se registra desde la app también se queda sin perfil.
--
-- Esta migración es segura de correr las veces que haga falta: instala el
-- trigger si falta (drop + create, no falla si ya existe) y de paso repara
-- cualquier cuenta de auth.users que haya quedado sin su fila en profiles.

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reparación: crea el perfil que falte, usando los mismos datos que hubiera
-- usado el trigger si hubiera corrido en su momento.
insert into public.profiles (
  id, full_name, last_name, phone, role, is_online,
  dni, document_type, license_type, address, nationality
)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  u.raw_user_meta_data ->> 'last_name',
  u.raw_user_meta_data ->> 'phone',
  coalesce((u.raw_user_meta_data ->> 'role')::user_role, 'client'),
  false,
  u.raw_user_meta_data ->> 'dni',
  u.raw_user_meta_data ->> 'document_type',
  u.raw_user_meta_data ->> 'license_type',
  u.raw_user_meta_data ->> 'address',
  u.raw_user_meta_data ->> 'nationality'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
