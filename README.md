# Essenza Team

App web mobile-first (installabile come PWA) per la rete di consulenti doTERRA.
Stack: Next.js 14 (App Router) + Tailwind CSS + Supabase (Auth + Postgres con RLS).

## Database

Migrazione: `supabase/migrations/20261109000000_profili_consulenti.sql`

Tabella `public.profiles` (1:1 con `auth.users`, creata automaticamente alla registrazione):

| Campo | Descrizione |
| --- | --- |
| `ruolo` | enum `ruolo_utente`: `admin` \| `consulente` (default `consulente`) |
| `codice_consulente` | codice di 6 caratteri generato automaticamente, usato come codice sponsor |
| `link_vetrina_doterra` | Link Vetrina doTERRA |
| `url_calendario_zoom` | URL calendario Zoom |
| `upline_id` | Sponsor diretto (FK su `profiles.id`) |
| `abilitato_colloqui` | flag "Abilitato Colloqui" (default `false`) |
| `accesso_formazione_avanzata` | flag "Accesso Formazione Avanzata" (default `false`) |

Sicurezza:
- Registrandosi si diventa sempre `consulente`; non è possibile auto-assegnarsi il ruolo admin.
- Il codice sponsor inserito in registrazione viene risolto in `upline_id`; se non esiste la registrazione fallisce.
- RLS: un consulente vede sé stesso, il proprio upline e la propria downline diretta; l'admin vede tutti.
- Un consulente può modificare solo i propri dati personali/link. Ruolo, flag, upline, codice ed email sono modificabili solo da un admin.
- Impedita la creazione di cicli nella genealogia (un upline non può stare nella propria downline).

### Primo Admin

La registrazione richiede un codice sponsor, quindi il primo account va creato dalla dashboard:
Supabase > Authentication > Users > **Add user** (spunta "Auto Confirm User"). Il profilo viene creato
automaticamente senza upline. Poi promuovilo ad admin e usa il suo `codice_consulente` come primo codice sponsor.

### Promuovere un Admin

Dal SQL Editor di Supabase:

```sql
update public.profiles set ruolo = 'admin' where email = 'tua@email.it';
```

## Sviluppo locale

Requisiti: Node 18+, Docker.

```bash
npm install
npx supabase start          # avvia Supabase in locale e applica le migrazioni
cp .env.example .env.local  # inserisci API_URL e ANON_KEY stampati da `supabase start`
npm run dev
```

## Collegare un progetto Supabase cloud

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Poi in `.env.local` (o nelle variabili d'ambiente di Vercel) imposta `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. In Supabase > Authentication > URL Configuration aggiungi
`https://<tuo-dominio>/auth/callback` ai Redirect URLs (serve per la conferma email).

## Schermate

- `/login` – accesso consulente
- `/registrazione` – registrazione in 2 step (dati personali → sponsor, vetrina doTERRA, Zoom). Supporta link di invito `/registrazione?ref=CODICE` (o il codice salvato dalla landing).
- `/c/CODICE` (o `/?ref=CODICE`) – landing pubblica del consulente: salva il codice nel cookie `essenza_ref` (90 giorni) e mostra **Acquista doTERRA** (vetrina del consulente) e **Prenota Colloquio**. Upline Delegation: se il consulente non è *Abilitato Colloqui*, si usa lo Zoom del primo upline abilitato risalendo l'organigramma (`landing_consulente()` nel DB). Chi torna su `/` senza login rivede la landing del consulente salvato.
- `/dashboard` – profilo, codice consulente, link di invito e stato delle abilitazioni
