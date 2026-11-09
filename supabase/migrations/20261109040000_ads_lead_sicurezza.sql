-- ADS di Gruppo: limiti anti-spam sui lead e assegnazione dei lead rimasti in attesa

alter table public.leads add column if not exists ip text;

create index if not exists leads_email_created_idx on public.leads (email, created_at);
create index if not exists leads_ip_created_idx on public.leads (ip, created_at);
create index if not exists leads_in_attesa_idx on public.leads (created_at) where consulente_id is null;

-- Assegna un lead in Round-Robin. Il chiamante deve tenere il lock 'essenza_round_robin_ads'.
create or replace function public.assegna_lead(p_lead_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  assegnatario uuid;
  nome_lead text;
begin
  select c.consulente_id into assegnatario
  from public.campagne_ads c
  where c.stato = 'attivo'
    and c.budget_totale_cents > 0
  order by c.lead_ricevuti,
           c.ultimo_lead_at nulls first,
           c.created_at
  limit 1;

  if assegnatario is null then
    return null;
  end if;

  update public.leads
  set consulente_id = assegnatario
  where id = p_lead_id and consulente_id is null
  returning nome into nome_lead;

  if not found then
    return null;
  end if;

  update public.campagne_ads
  set lead_ricevuti = lead_ricevuti + 1,
      ultimo_lead_at = now(),
      updated_at = now()
  where consulente_id = assegnatario;

  insert into public.notifiche (consulente_id, titolo, messaggio, lead_id)
  values (
    assegnatario,
    'Nuovo lead dalle ADS di Gruppo',
    format('%s ti ha lasciato i suoi contatti: scrivigli al più presto!', nome_lead),
    p_lead_id
  );

  return assegnatario;
end;
$$;

revoke all on function public.assegna_lead(uuid) from public, anon, authenticated;

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
  v_email text := lower(trim(p_email));
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  -- IP impostato dal proxy (non falsificabile dal client), non il primo valore di x-forwarded-for
  v_ip text := coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-real-ip');
  nuovo_lead uuid;
begin
  perform pg_advisory_xact_lock(hashtext('essenza_round_robin_ads'));

  -- Stessa email nelle ultime 24 ore: già in carico, nessun nuovo lead
  if exists (
    select 1 from public.leads
    where email = v_email and created_at > now() - interval '24 hours'
  ) then
    return;
  end if;

  if v_ip is not null and (
    select count(*) from public.leads
    where ip = v_ip and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Troppe richieste, riprova più tardi';
  end if;

  insert into public.leads (nome, email, telefono, messaggio, ip)
  values (
    trim(p_nome),
    v_email,
    nullif(trim(p_telefono), ''),
    nullif(trim(p_messaggio), ''),
    v_ip
  )
  returning id into nuovo_lead;

  perform public.assegna_lead(nuovo_lead);
end;
$$;

-- Un nuovo versamento distribuisce anche i lead arrivati quando nessuna campagna era attiva
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
  lead_in_attesa uuid;
begin
  if p_importo_cents is null or p_importo_cents <= 0 then
    raise exception 'Importo non valido';
  end if;

  perform pg_advisory_xact_lock(hashtext('essenza_round_robin_ads'));

  insert into public.pagamenti_ads (consulente_id, importo_cents, provider, riferimento)
  values (p_consulente_id, p_importo_cents, p_provider, p_riferimento)
  on conflict (riferimento) do nothing;

  if found then
    insert into public.campagne_ads (consulente_id, budget_totale_cents, stato)
    values (p_consulente_id, p_importo_cents, 'attivo')
    on conflict (consulente_id) do update
      set budget_totale_cents = public.campagne_ads.budget_totale_cents + excluded.budget_totale_cents,
          stato = 'attivo',
          updated_at = now();

    for lead_in_attesa in
      select id from public.leads where consulente_id is null order by created_at
    loop
      perform public.assegna_lead(lead_in_attesa);
    end loop;
  end if;

  select * into campagna from public.campagne_ads where consulente_id = p_consulente_id;
  return campagna;
end;
$$;
