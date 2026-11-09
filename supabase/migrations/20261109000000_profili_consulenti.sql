-- Ruoli utente
create type public.ruolo_utente as enum ('admin', 'consulente');

-- Codice consulente breve e condivisibile (usato come "codice sponsor" in registrazione)
create or replace function public.genera_codice_consulente()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  codice text;
begin
  loop
    codice := '';
    for i in 1..6 loop
      codice := codice || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles p where p.codice_consulente = codice);
  end loop;
  return codice;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nome text not null,
  cognome text not null,
  telefono text,
  ruolo public.ruolo_utente not null default 'consulente',
  codice_consulente text not null unique,
  link_vetrina_doterra text,
  url_calendario_zoom text,
  upline_id uuid references public.profiles (id) on delete set null,
  abilitato_colloqui boolean not null default false,
  accesso_formazione_avanzata boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint upline_diverso_da_se check (upline_id is null or upline_id <> id),
  constraint link_vetrina_url check (link_vetrina_doterra is null or link_vetrina_doterra ~* '^https?://'),
  constraint url_zoom_url check (url_calendario_zoom is null or url_calendario_zoom ~* '^https?://')
);

alter table public.profiles
  alter column codice_consulente set default public.genera_codice_consulente();

create index profiles_upline_id_idx on public.profiles (upline_id);

comment on column public.profiles.link_vetrina_doterra is 'Link Vetrina doTERRA personale del consulente';
comment on column public.profiles.url_calendario_zoom is 'URL del calendario Zoom per prenotare colloqui';
comment on column public.profiles.upline_id is 'Sponsor diretto (Upline)';
comment on column public.profiles.abilitato_colloqui is 'Abilitato Colloqui';
comment on column public.profiles.accesso_formazione_avanzata is 'Accesso Formazione Avanzata';

-- Helper: l'utente corrente e' admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and ruolo = 'admin'
  );
$$;

-- Crea il profilo alla registrazione, leggendo i metadati inviati dal form.
-- Il ruolo e' sempre 'consulente': non e' possibile auto-assegnarsi 'admin'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  codice_sponsor text := upper(nullif(trim(meta ->> 'codice_sponsor'), ''));
  sponsor_id uuid;
begin
  if codice_sponsor is not null then
    select id into sponsor_id from public.profiles where codice_consulente = codice_sponsor;
    if sponsor_id is null then
      raise exception 'Codice sponsor non valido: %', codice_sponsor;
    end if;
  end if;

  insert into public.profiles (
    id, email, nome, cognome, telefono,
    link_vetrina_doterra, url_calendario_zoom, upline_id
  ) values (
    new.id,
    new.email,
    coalesce(nullif(trim(meta ->> 'nome'), ''), split_part(new.email, '@', 1)),
    coalesce(nullif(trim(meta ->> 'cognome'), ''), ''),
    nullif(trim(meta ->> 'telefono'), ''),
    nullif(trim(meta ->> 'link_vetrina_doterra'), ''),
    nullif(trim(meta ->> 'url_calendario_zoom'), ''),
    sponsor_id
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Protezione campi riservati + controllo cicli nella genealogia
create or replace function public.profiles_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();

  -- auth.uid() nullo = contesto server/SQL editor/service role: nessuna restrizione
  if auth.uid() is not null and not public.is_admin() then
    if new.ruolo is distinct from old.ruolo
       or new.abilitato_colloqui is distinct from old.abilitato_colloqui
       or new.accesso_formazione_avanzata is distinct from old.accesso_formazione_avanzata
       or new.upline_id is distinct from old.upline_id
       or new.codice_consulente is distinct from old.codice_consulente
       or new.email is distinct from old.email then
      raise exception 'Solo un Admin puo'' modificare ruolo, abilitazioni, upline, codice o email';
    end if;
  end if;

  if new.upline_id is distinct from old.upline_id and new.upline_id is not null then
    if exists (
      with recursive downline as (
        select id from public.profiles where upline_id = new.id
        union
        select p.id from public.profiles p join downline d on p.upline_id = d.id
      )
      select 1 from downline where id = new.upline_id
    ) then
      raise exception 'L''upline scelto fa parte della downline del consulente';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- Verifica pubblica del codice sponsor (usata dal form di registrazione)
create or replace function public.verifica_codice_sponsor(codice text)
returns table (nome text, cognome text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.nome, p.cognome
  from public.profiles p
  where p.codice_consulente = upper(trim(codice));
$$;

revoke all on function public.verifica_codice_sponsor(text) from public;
grant execute on function public.verifica_codice_sponsor(text) to anon, authenticated;

-- Upline dell'utente corrente (security definer per evitare ricorsione RLS)
create or replace function public.mio_upline_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select upline_id from public.profiles where id = auth.uid();
$$;

-- Row Level Security
alter table public.profiles enable row level security;

-- Ogni consulente vede: se stesso, il proprio upline e la propria downline diretta. L'admin vede tutti.
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or upline_id = auth.uid()
    or id = public.mio_upline_id()
    or public.is_admin()
  );

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated
  using (public.is_admin());
