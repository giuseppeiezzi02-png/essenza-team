"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/Alert";
import Spinner from "@/components/Spinner";
import { euroInCents, formatEuro, IMPORTI_RAPIDI, validaCarta, validaImporto } from "@/lib/ads";

const formattaNumero = (v: string) =>
  v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");

const formattaScadenza = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export default function PagamentoAdsForm() {
  const router = useRouter();
  const [importo, setImporto] = useState("100");
  const [numero, setNumero] = useState("");
  const [scadenza, setScadenza] = useState("");
  const [cvc, setCvc] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [successo, setSuccesso] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  const importoCents = euroInCents(importo);

  async function paga(e: React.FormEvent) {
    e.preventDefault();
    setSuccesso(null);
    const err = validaImporto(importoCents) ?? validaCarta({ numero, scadenza, cvc });
    if (err) return setErrore(err);
    setErrore(null);
    setInvio(true);
    try {
      const res = await fetch("/api/ads/pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importoCents, numero, scadenza, cvc }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setErrore(json.errore ?? "Pagamento non riuscito, riprova.");
      setSuccesso(`Pagamento di ${formatEuro(importoCents!)} riuscito: la tua partecipazione è attiva!`);
      setNumero("");
      setScadenza("");
      setCvc("");
      router.refresh();
    } catch {
      setErrore("Connessione non riuscita, riprova.");
    } finally {
      setInvio(false);
    }
  }

  return (
    <form onSubmit={paga} noValidate className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-stone-700">Quota da versare</p>
        <div className="grid grid-cols-3 gap-2">
          {IMPORTI_RAPIDI.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setImporto(String(v))}
              aria-pressed={importo === String(v)}
              className={`min-h-[44px] rounded-xl border text-sm font-semibold ${
                importo === String(v)
                  ? "border-teal-700 bg-teal-50 text-teal-800"
                  : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              {formatEuro(v * 100)}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-sm text-stone-600" htmlFor="importo">
          Oppure un altro importo (€)
        </label>
        <input
          id="importo"
          inputMode="decimal"
          className="input mt-1"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
        />
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-700">Carta di pagamento</p>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Simulazione</span>
        </div>
        <div>
          <label className="block text-sm text-stone-600" htmlFor="numero">Numero carta</label>
          <input
            id="numero"
            inputMode="numeric"
            autoComplete="off"
            placeholder="4242 4242 4242 4242"
            className="input mt-1 font-mono"
            value={numero}
            onChange={(e) => setNumero(formattaNumero(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-stone-600" htmlFor="scadenza">Scadenza</label>
            <input
              id="scadenza"
              inputMode="numeric"
              autoComplete="off"
              placeholder="MM/AA"
              className="input mt-1 font-mono"
              value={scadenza}
              onChange={(e) => setScadenza(formattaScadenza(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm text-stone-600" htmlFor="cvc">CVC</label>
            <input
              id="cvc"
              inputMode="numeric"
              autoComplete="off"
              placeholder="123"
              className="input mt-1 font-mono"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
        </div>
        <p className="text-xs text-stone-500">
          Nessun addebito reale: usa la carta di test 4242 4242 4242 4242, una scadenza futura e un CVC qualsiasi.
        </p>
      </div>

      {errore && <Alert kind="error">{errore}</Alert>}
      {successo && <Alert kind="success">{successo}</Alert>}

      <button type="submit" className="btn-primary" disabled={invio}>
        {invio ? <Spinner /> : null}
        {invio ? "Pagamento in corso…" : `Paga ${importoCents ? formatEuro(importoCents) : ""}`}
      </button>
    </form>
  );
}
