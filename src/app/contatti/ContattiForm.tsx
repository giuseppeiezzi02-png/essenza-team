"use client";

import { useState } from "react";
import Alert from "@/components/Alert";
import Spinner from "@/components/Spinner";
import { createClient } from "@/lib/supabase/client";
import { validaEmail } from "@/lib/validation";

export default function ContattiForm() {
  const [dati, setDati] = useState({ nome: "", email: "", telefono: "", messaggio: "", azienda: "" });
  const [privacy, setPrivacy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inviato, setInviato] = useState(false);
  const [invio, setInvio] = useState(false);

  const set = (k: keyof typeof dati) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDati((d) => ({ ...d, [k]: e.target.value }));

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    const err = !dati.nome.trim()
      ? "Inserisci il tuo nome"
      : validaEmail(dati.email) ?? (!privacy ? "Devi accettare l'informativa privacy" : null);
    if (err) return setErrore(err);
    setErrore(null);
    // Campo trappola per i bot: lo compilano solo loro
    if (dati.azienda) return setInviato(true);
    setInvio(true);
    const { error } = await createClient().rpc("invia_lead", {
      p_nome: dati.nome.trim(),
      p_email: dati.email.trim(),
      p_telefono: dati.telefono.trim(),
      p_messaggio: dati.messaggio.trim(),
    });
    setInvio(false);
    if (error) {
      return setErrore(
        error.message.includes("Troppe richieste")
          ? "Hai già inviato diverse richieste: riprova tra un'ora."
          : "Invio non riuscito, controlla i dati e riprova.",
      );
    }
    setInviato(true);
  }

  if (inviato) {
    return (
      <Alert kind="success">
        Grazie {dati.nome.trim()}! Un consulente del nostro team ti contatterà a breve.
      </Alert>
    );
  }

  return (
    <form onSubmit={invia} noValidate className="space-y-4">
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-stone-700">Nome e cognome</label>
        <input id="nome" autoComplete="name" maxLength={100} className="input mt-1" value={dati.nome} onChange={set("nome")} />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-stone-700">Email</label>
        <input id="email" type="email" autoComplete="email" maxLength={254} className="input mt-1" value={dati.email} onChange={set("email")} />
      </div>
      <div>
        <label htmlFor="telefono" className="block text-sm font-medium text-stone-700">Telefono (facoltativo)</label>
        <input id="telefono" type="tel" autoComplete="tel" maxLength={30} className="input mt-1" value={dati.telefono} onChange={set("telefono")} />
      </div>
      <div>
        <label htmlFor="messaggio" className="block text-sm font-medium text-stone-700">Come possiamo aiutarti? (facoltativo)</label>
        <textarea id="messaggio" rows={4} maxLength={2000} className="input mt-1" value={dati.messaggio} onChange={set("messaggio")} />
      </div>
      <div className="hidden" aria-hidden>
        <label htmlFor="azienda">Azienda</label>
        <input id="azienda" tabIndex={-1} autoComplete="off" value={dati.azienda} onChange={set("azienda")} />
      </div>
      <label className="flex items-start gap-3 text-sm text-stone-600">
        <input type="checkbox" className="mt-0.5 h-5 w-5 accent-teal-700" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
        Acconsento al trattamento dei miei dati per essere ricontattato.
      </label>
      {errore && <Alert kind="error">{errore}</Alert>}
      <button type="submit" className="btn-primary" disabled={invio}>
        {invio ? <Spinner /> : null}
        {invio ? "Invio in corso…" : "Voglio essere contattato"}
      </button>
    </form>
  );
}
