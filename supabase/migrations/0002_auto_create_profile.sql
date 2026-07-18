-- Crea el perfil automáticamente cuando se registra un usuario nuevo en
-- auth.users, en vez de depender de un insert desde el cliente (que falla
-- por RLS si la confirmación de email está activada, porque en ese momento
-- todavía no hay sesión autenticada).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role, is_online)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'client'),
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
