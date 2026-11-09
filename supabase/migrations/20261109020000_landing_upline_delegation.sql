-- Dati pubblici della landing di un consulente, con la regola "Upline Delegation":
-- il colloquio si prenota con il primo profilo della catena (consulente, upline, upline dell'upline, ...)
-- che ha 'Abilitato Colloqui' e un calendario Zoom.
create or replace function public.landing_consulente(codice text)
returns table (
  nome text,
  cognome text,
  link_vetrina_doterra text,
  url_colloquio text,
  colloquio_nome text,
  colloquio_cognome text,
  colloquio_delegato boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with recursive consulente as (
    select p.* from public.profiles p where p.codice_consulente = upper(trim(codice))
  ),
  catena as (
    select c.id, c.upline_id, c.nome, c.cognome, c.abilitato_colloqui, c.url_calendario_zoom, 0 as livello
    from consulente c
    union all
    select u.id, u.upline_id, u.nome, u.cognome, u.abilitato_colloqui, u.url_calendario_zoom, k.livello + 1
    from catena k
    join public.profiles u on u.id = k.upline_id
    where k.livello < 100
  ),
  leader as (
    select * from catena
    where abilitato_colloqui and url_calendario_zoom is not null
    order by livello
    limit 1
  )
  select c.nome, c.cognome, c.link_vetrina_doterra,
         l.url_calendario_zoom, l.nome, l.cognome, l.livello > 0
  from consulente c
  left join leader l on true;
$$;

revoke all on function public.landing_consulente(text) from public;
grant execute on function public.landing_consulente(text) to anon, authenticated;
