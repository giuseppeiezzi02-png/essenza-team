-- ADS di Gruppo: partecipazione a budget, lead dal form globale assegnati in Round-Robin, notifiche in-app

create type public.stato_campagna as enum ('inattivo', 'attivo');

create table public.campagne_ads (
  consulente_id uuid primary key references public.profiles (id) on delete cascade,
  budget_totale_cents bigint not null default 0 check (budget_totale_cents >= 0),
  stato public.stato_campagna not null default 'inattivo',
  lead_ricevuti integer not null default 0 check (lead_ricevuti >= 0),
  ultimo_lead_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campagne_ads_round_robin_idx on public.campagne_ads (lead_ricevuti, ultimo_lead_at nulls first)
  where stato = 'attivo' and budget_totale_cents > 0;

create table public.pagamenti_ads (
  id uuid primary key default gen_random_uuid(),
  consulente_id uuid not null references public.profiles (id) on delete cascade,
  importo_cents integer not null check (importo_cents > 0),
  provider text not null check (provider in ('simulato', 'stripe')),
  riferimento text not null unique,
  created_at timestamptz not null default now()
);

create index pagamenti_ads_consulente_idx on public.pagamenti_ads (consulente_id, created_at desc);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 100),
  email text not null check (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  telefono text check (char_length(telefono) <= 30),
  messaggio text check (char_length(messaggio) <= 2000),
  consulente_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index leads_consulente_idx on public.leads (consulente_id, created_at desc);

create table public.notifiche (
  id uuid primary key default gen_random_uuid(),
  consulente_id uuid not null references public.profiles (id) on delete cascade,
  titolo text not null,
  messaggio text not null,
  lead_id uuid references public.leads (id) on delete cascade,
  letta boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifiche_consulente_idx on public.notifiche (consulente_id, created_at desc);

alter table public.campagne_ads enable row level security;
alter table public.pagamenti_ads enable row level security;
alter table public.leads enable row level security;
alter table public.notifiche enable row level security;

-- Sola lettura per i client: le scritture passano dalle funzioni qui sotto
create policy "campagne_ads_select" on public.campagne_ads
  for select to authenticated using (consulente_id = auth.uid() or public.is_admin());
create policy "pagamenti_ads_select" on public.pagamenti_ads
  for select to authenticated using (consulente_id = auth.uid() or public.is_admin());
create policy "leads_select" on public.leads
  for select to authenticated using (consulente_id = auth.uid() or public.is_admin());
create policy "notifiche_select" on public.notifiche
  for select to authenticated using (consulente_id = auth.uid());

-- Accredito dopo un pagamento riuscito. Solo il server (service role) puo' chiamarla.
-- Idempotente sul riferimento del pagamento (es. id della sessione Stripe).
create or replace function public.accredita_budget_ads(
  p_consulente_id uuid,
  p_importo_cents integer,
  p_provider text,
  p_riferimento text
)
returns public.campagne_ads
language plpgsql
security definer
set search_path = ''
as $$
declare
  campagna public.campagne_ads;
begin
  if p_importo_cents is null or p_importo_cents <= 0 then
    raise exception 'Importo non valido';
  end if;

  insert into public.pagamenti_ads (consulente_id, importo_cents, provider, riferimento)
  values (p_consulente_id, p_importo_cents, p_provider, p_riferimento)
  on conflict (riferimento) do nothing;

  if not found then
    select * into campagna from public.campagne_ads where consulente_id = p_consulente_id;
    return campagna;
  end if;

  insert into public.campagne_ads (consulente_id, budget_totale_cents, stato)
  values (p_consulente_id, p_importo_cents, 'attivo')
  on conflict (consulente_id) do update
    set budget_totale_cents = public.campagne_ads.budget_totale_cents + excluded.budget_totale_cents,
        stato = 'attivo',
        updated_at = now()
  returning * into campagna;

  return campagna;
end;
$$;

revoke all on function public.accredita_budget_ads(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.accredita_budget_ads(uuid, integer, text, text) to service_role;

-- Form contatti globale delle ADS. Round-Robin: il lead va al consulente attivo con budget
-- che ha ricevuto meno lead (a parita', a chi ne ha ricevuto uno da piu' tempo).
create or replace function public.invia_lead(
  p_nome text,
  p_email text,
  p_telefono text default null,
  p_messaggio text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  assegnatario uuid;
  nuovo_lead uuid;
begin
  -- Serializza le assegnazioni: due lead simultanei non finiscono allo stesso consulente per errore
  perform pg_advisory_xact_lock(hashtext('essenza_round_robin_ads'));

  select c.consulente_id into assegnatario
  from public.campagne_ads c
  where c.stato = 'attivo' and c.budget_totale_cents > 0
  order by c.lead_ricevuti, c.ultimo_lead_at nulls first, c.created_at
  limit 1;

  insert into public.leads (nome, email, telefono, messaggio, consulente_id)
  values (
    trim(p_nome),
    lower(trim(p_email)),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_messaggio), ''),
    assegnatario
  )
  returning id into nuovo_lead;

  if assegnatario is not null then
    update public.campagne_ads
    set lead_ricevuti = lead_ricevuti + 1, ultimo_lead_at = now(), updated_at = now()
    where consulente_id = assegnatario;

    insert into public.notifiche (consulente_id, titolo, messaggio, lead_id)
    values (
      assegnatario,
      'Nuovo lead dalle ADS di Gruppo',
      format('%s ti ha lasciato i suoi contatti: scrivigli al più presto!', trim(p_nome)),
      nuovo_lead
    );
  end if;
end;
$$;

revoke all on function public.invia_lead(text, text, text, text) from public;
grant execute on function public.invia_lead(text, text, text, text) to anon, authenticated;

create or replace function public.segna_notifiche_lette()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifiche set letta = true where consulente_id = auth.uid() and not letta;
$$;

revoke all on function public.segna_notifiche_lette() from public, anon;
grant execute on function public.segna_notifiche_lette() to authenticated;

-- Notifiche in tempo reale nella dashboard (Supabase Realtime rispetta l'RLS)
alter publication supabase_realtime add table public.notifiche;
