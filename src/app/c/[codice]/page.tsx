import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { normalizzaCodice } from "@/lib/referral";
import { createClient } from "@/lib/supabase/server";

type Landing = {
  nome: string;
  cognome: string;
  link_vetrina_doterra: string | null;
  url_colloquio: string | null;
  colloquio_nome: string | null;
  colloquio_cognome: string | null;
  colloquio_delegato: boolean | null;
};

async function caricaLanding(codice: string): Promise<Landing | null> {
  const supabase = createClient();
  const { data } = await supabase.rpc("landing_consulente", { codice }).maybeSingle<Landing>();
  return data;
}

export async function generateMetadata({ params }: { params: { codice: string } }): Promise<Metadata> {
  const codice = normalizzaCodice(params.codice);
  const landing = codice ? await caricaLanding(codice) : null;
  return { title: landing ? `${landing.nome} ${landing.cognome} · doTERRA` : "Consulente non trovato" };
}

function PulsanteDisattivato({ label, nota }: { label: string; nota: string }) {
  return (
    <div>
      <span aria-disabled="true" className="btn-primary cursor-not-allowed opacity-50">
        {label}
      </span>
      <p className="mt-2 text-center text-sm text-stone-500">{nota}</p>
    </div>
  );
}

export default async function LandingConsulente({ params }: { params: { codice: string } }) {
  const codice = normalizzaCodice(params.codice);
  const landing = codice ? await caricaLanding(codice) : null;

  if (!codice || !landing) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-stone-800">Consulente non trovato</h1>
        <p className="mt-2 text-stone-600">Il link che hai aperto non è valido o non è più attivo.</p>
        <Link href="/login" className="btn-secondary mt-6">
          Vai al login
        </Link>
      </main>
    );
  }

  const leader = `${landing.colloquio_nome ?? ""} ${landing.colloquio_cognome ?? ""}`.trim();

  return (
    <main className="flex min-h-[100dvh] flex-col">
      <header className="relative overflow-hidden bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-600 px-6 pb-16 pt-[max(env(safe-area-inset-top),2.5rem)] text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative mx-auto w-full max-w-md">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-9 w-9 rounded-lg ring-2 ring-white/30" />
            <span className="text-sm font-semibold uppercase tracking-wider text-teal-50">{APP_NAME}</span>
          </div>
          <p className="mt-6 text-teal-50/90">Il tuo consulente doTERRA</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight">
            {landing.nome} {landing.cognome}
          </h1>
        </div>
      </header>

      <section className="relative -mt-8 flex-1 rounded-t-3xl bg-stone-50 px-6 pb-[max(env(safe-area-inset-bottom),2rem)] pt-8">
        <div className="mx-auto w-full max-w-md space-y-6">
          {landing.link_vetrina_doterra ? (
            <a href={landing.link_vetrina_doterra} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Acquista doTERRA
            </a>
          ) : (
            <PulsanteDisattivato label="Acquista doTERRA" nota="Vetrina non ancora disponibile." />
          )}

          {landing.url_colloquio ? (
            <div>
              <a href={landing.url_colloquio} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Prenota Colloquio
              </a>
              {landing.colloquio_delegato && leader && (
                <p className="mt-2 text-center text-sm text-stone-500">Il colloquio sarà con {leader}, del team di {landing.nome}.</p>
              )}
            </div>
          ) : (
            <PulsanteDisattivato label="Prenota Colloquio" nota="Al momento non ci sono colloqui prenotabili." />
          )}

          <p className="pt-4 text-center text-sm text-stone-600">
            Vuoi diventare consulente?{" "}
            <Link href={`/registrazione?ref=${codice}`} className="font-semibold text-teal-700 hover:underline">
              Entra nel team
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
