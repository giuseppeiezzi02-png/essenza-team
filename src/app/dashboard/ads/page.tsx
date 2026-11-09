import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatData, formatEuro } from "@/lib/ads";
import { createClient } from "@/lib/supabase/server";
import type { CampagnaAds, Lead, PagamentoAds } from "@/lib/types";
import PagamentoAdsForm from "./PagamentoAdsForm";

export const metadata: Metadata = { title: "ADS di Gruppo" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-stone-200">
      <p className="text-lg font-bold text-teal-800">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );
}

export default async function AdsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: campagna }, { data: pagamenti }, { data: leads }] = await Promise.all([
    supabase.from("campagne_ads").select("*").eq("consulente_id", user.id).maybeSingle<CampagnaAds>(),
    supabase
      .from("pagamenti_ads")
      .select("id, importo_cents, provider, created_at")
      .eq("consulente_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<PagamentoAds[]>(),
    supabase
      .from("leads")
      .select("id, nome, email, telefono, messaggio, created_at")
      .eq("consulente_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Lead[]>(),
  ]);

  const attiva = campagna?.stato === "attivo";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md space-y-6 px-6 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),1.5rem)]">
      <Link href="/dashboard" className="text-sm font-medium text-teal-700">
        ← La mia area
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-stone-900">ADS di Gruppo</h1>
        <p className="mt-1 text-stone-600">
          Versa una quota nel budget comune: i contatti raccolti dalle ADS vengono distribuiti a turno tra i consulenti
          attivi, partendo da chi ne ha ricevuti meno.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="Stato" value={attiva ? "Attivo" : "Non attivo"} />
        <Stat label="Budget versato" value={formatEuro(campagna?.budget_totale_cents ?? 0)} />
        <Stat label="Lead ricevuti" value={String(campagna?.lead_ricevuti ?? 0)} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">{attiva ? "Aggiungi budget" : "Partecipa"}</h2>
        <PagamentoAdsForm />
      </section>

      <section id="lead">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">I tuoi lead</h2>
        {leads?.length ? (
          <ul className="space-y-3">
            {leads.map((l) => (
              <li key={l.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold text-stone-900">{l.nome}</p>
                  <p className="shrink-0 text-xs text-stone-500">{formatData(l.created_at)}</p>
                </div>
                <a href={`mailto:${l.email}`} className="block break-all text-sm text-teal-700 underline">
                  {l.email}
                </a>
                {l.telefono && (
                  <a href={`tel:${l.telefono}`} className="block text-sm text-teal-700 underline">
                    {l.telefono}
                  </a>
                )}
                {l.messaggio && <p className="mt-2 whitespace-pre-line text-sm text-stone-600">{l.messaggio}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">Ancora nessun lead assegnato.</p>
        )}
      </section>

      {pagamenti?.length ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-stone-700">Ultimi versamenti</h2>
          <ul className="divide-y divide-stone-100 rounded-xl bg-white px-4 shadow-sm ring-1 ring-stone-200">
            {pagamenti.map((p) => (
              <li key={p.id} className="flex justify-between py-3 text-sm">
                <span className="text-stone-600">{formatData(p.created_at)}</span>
                <span className="font-semibold text-stone-900">{formatEuro(p.importo_cents)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
