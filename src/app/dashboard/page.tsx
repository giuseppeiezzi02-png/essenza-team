import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Profilo } from "@/lib/types";
import CopiaLinkInvito from "./CopiaLinkInvito";

export const metadata: Metadata = { title: "La mia area" };

function Badge({ attivo, label }: { attivo: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          attivo ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"
        }`}
      >
        {attivo ? "Attivo" : "Non attivo"}
      </span>
    </div>
  );
}

function Riga({ label, value, href }: { label: string; value: string | null; href?: boolean }) {
  return (
    <div className="py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-0.5 break-all text-stone-900">
        {value ? (
          href ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-stone-400">Non impostato</span>
        )}
      </dd>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profilo } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profilo>();

  if (!profilo) {
    return <p className="p-6">Profilo non trovato. Contatta un amministratore.</p>;
  }

  const { data: upline } = profilo.upline_id
    ? await supabase
        .from("profiles")
        .select("nome, cognome")
        .eq("id", profilo.upline_id)
        .single<Pick<Profilo, "nome" | "cognome">>()
    : { data: null };

  return (
    <main className="min-h-[100dvh] pb-[max(env(safe-area-inset-bottom),2rem)]">
      <header className="bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-600 px-6 pb-10 pt-[max(env(safe-area-inset-top),2rem)] text-white">
        <div className="mx-auto flex max-w-md items-start justify-between gap-4">
          <div>
            <p className="text-sm text-teal-50/90">{APP_NAME}</p>
            <h1 className="mt-1 text-2xl font-bold">Ciao, {profilo.nome}!</h1>
            <span className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {profilo.ruolo === "admin" ? "Admin" : "Consulente"}
            </span>
          </div>
          <form action="/auth/logout" method="post">
            <button className="rounded-lg bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25">Esci</button>
          </form>
        </div>
      </header>

      <div className="mx-auto -mt-6 max-w-md space-y-6 px-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Il tuo codice consulente</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-teal-800">
            {profilo.codice_consulente}
          </p>
          <p className="mt-1 text-sm text-stone-500">Condividilo con le persone che inviti nel team.</p>
          <CopiaLinkInvito codice={profilo.codice_consulente} />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-700">Abilitazioni</h2>
          <Badge attivo={profilo.abilitato_colloqui} label="Abilitato Colloqui" />
          <Badge attivo={profilo.accesso_formazione_avanzata} label="Accesso Formazione Avanzata" />
        </section>

        <section className="rounded-2xl bg-white px-5 py-2 shadow-sm ring-1 ring-stone-200">
          <dl className="divide-y divide-stone-100">
            <Riga label="Email" value={profilo.email} />
            <Riga label="Telefono" value={profilo.telefono} />
            <Riga label="Sponsor (Upline)" value={upline ? `${upline.nome} ${upline.cognome}` : null} />
            <Riga label="Link Vetrina doTERRA" value={profilo.link_vetrina_doterra} href />
            <Riga label="Calendario Zoom" value={profilo.url_calendario_zoom} href />
          </dl>
        </section>
      </div>
    </main>
  );
}
