-- I link devono puntare davvero a doTERRA / Zoom anche se aggiornati via API
alter table public.profiles
  drop constraint link_vetrina_url,
  drop constraint url_zoom_url,
  add constraint link_vetrina_url check (
    link_vetrina_doterra is null
    or link_vetrina_doterra ~* '^https?://([a-z0-9-]+\.)*doterra\.(com|me)(:[0-9]+)?([/?#]|$)'
  ),
  add constraint url_zoom_url check (
    url_calendario_zoom is null
    or url_calendario_zoom ~* '^https?://([a-z0-9-]+\.)*zoom\.(us|com)(:[0-9]+)?([/?#]|$)'
  );

-- Un profilo si elimina solo cancellando l'utente Auth (cascade), mai da solo
drop policy "profiles_delete_admin" on public.profiles;

-- Mantiene profiles.email allineata all'email dell'account Auth
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.handle_user_email_change();
