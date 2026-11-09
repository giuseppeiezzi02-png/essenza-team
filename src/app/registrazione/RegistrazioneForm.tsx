"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/Alert";
import Field from "@/components/Field";
import PasswordField from "@/components/PasswordField";
import Spinner from "@/components/Spinner";
import { createClient } from "@/lib/supabase/client";
import {
  traduciErroreAuth,
  validaEmail,
  validaLinkVetrina,
  validaPassword,
  validaUrlZoom,
} from "@/lib/validation";

type Dati = {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  password: string;
  confermaPassword: string;
  codiceSponsor: string;
  linkVetrina: string;
  urlZoom: string;
  privacy: boolean;
};

type Errori = Partial<Record<keyof Dati, string>>;

type StatoSponsor =
  | { stato: "vuoto" }
  | { stato: "verifica" }
  | { stato: "valido"; nome: string }
  | { stato: "non_valido" };

export default function RegistrazioneForm({ codiceSponsorIniziale }: { codiceSponsorIniziale: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [dati, setDati] = useState<Dati>({
    nome: "",
    cognome: "",
    email: "",
    telefono: "",
    password: "",
    confermaPassword: "",
    codiceSponsor: codiceSponsorIniziale.toUpperCase(),
    linkVetrina: "",
    urlZoom: "",
    privacy: false,
  });
  const [errori, setErrori] = useState<Errori>({});
  const [erroreGlobale, setErroreGlobale] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailInviata, setEmailInviata] = useState(false);
  const [sponsor, setSponsor] = useState<StatoSponsor>({ stato: "vuoto" });

  const set = <K extends keyof Dati>(k: K, v: Dati[K]) => {
    setDati((d) => ({ ...d, [k]: v }));
    setErrori((e) => ({ ...e, [k]: undefined }));
  };

  const verificaSponsor = useCallback(async (codice: string) => {
    const c = codice.trim().toUpperCase();
    if (!c) return setSponsor({ stato: "vuoto" });
    setSponsor({ stato: "verifica" });
    const supabase = createClient();
    const { data, error } = await supabase.rpc("verifica_codice_sponsor", { codice: c });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return setSponsor({ stato: "non_valido" });
    setSponsor({ stato: "valido", nome: `${row.nome} ${row.cognome}`.trim() });
  }, []);

  useEffect(() => {
    if (dati.codiceSponsor.trim().length < 6) {
      setSponsor({ stato: "vuoto" });
      return;
    }
    const t = setTimeout(() => verificaSponsor(dati.codiceSponsor), 350);
    return () => clearTimeout(t);
  }, [dati.codiceSponsor, verificaSponsor]);

  function validaStep1(): boolean {
    const e: Errori = {};
    if (!dati.nome.trim()) e.nome = "Inserisci il nome";
    if (!dati.cognome.trim()) e.cognome = "Inserisci il cognome";
    e.email = validaEmail(dati.email) ?? undefined;
    e.password = validaPassword(dati.password) ?? undefined;
    if (dati.confermaPassword !== dati.password) e.confermaPassword = "Le password non coincidono";
    setErrori(e);
    return Object.values(e).every((v) => !v);
  }

  function validaStep2(): boolean {
    const e: Errori = {};
    if (!dati.codiceSponsor.trim()) e.codiceSponsor = "Inserisci il codice del tuo sponsor";
    else if (sponsor.stato === "non_valido") e.codiceSponsor = "Codice sponsor non trovato";
    e.linkVetrina = validaLinkVetrina(dati.linkVetrina) ?? undefined;
    e.urlZoom = validaUrlZoom(dati.urlZoom) ?? undefined;
    if (!dati.privacy) e.privacy = "Devi accettare l'informativa privacy";
    setErrori(e);
    return Object.values(e).every((v) => !v);
  }

  function avanti(e: React.FormEvent) {
    e.preventDefault();
    if (validaStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function registra(e: React.FormEvent) {
    e.preventDefault();
    setErroreGlobale(null);
    if (!validaStep2()) return;

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: dati.email.trim(),
      password: dati.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          nome: dati.nome.trim(),
          cognome: dati.cognome.trim(),
          telefono: dati.telefono.trim(),
          codice_sponsor: dati.codiceSponsor.trim().toUpperCase(),
          link_vetrina_doterra: dati.linkVetrina.trim(),
          url_calendario_zoom: dati.urlZoom.trim(),
        },
      },
    });
    setLoading(false);

    if (error) return setErroreGlobale(traduciErroreAuth(error.message));
    // Con conferma email attiva e email gia' registrata Supabase restituisce un utente senza identita'
    if (data.user && data.user.identities?.length === 0)
      return setErroreGlobale("Esiste già un account con questa email");

    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
    } else {
      setEmailInviata(true);
    }
  }

  if (emailInviata) {
    return (
      <div className="space-y-5">
        <Alert kind="success">
          <p className="font-semibold">Registrazione completata!</p>
          <p className="mt-1">
            Ti abbiamo inviato un&apos;email a <strong>{dati.email}</strong>. Apri il link per confermare
            l&apos;account e accedere.
          </p>
        </Alert>
        <button className="btn-secondary" onClick={() => router.push("/login")}>
          Vai al login
        </button>
      </div>
    );
  }

  return (
    <div>
      <ol className="mb-6 flex items-center gap-3" aria-label="Avanzamento">
        {[1, 2].map((n) => (
          <li key={n} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                step >= n ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-500"
              }`}
              aria-current={step === n ? "step" : undefined}
            >
              {n}
            </span>
            <span className={`text-sm font-medium ${step >= n ? "text-stone-900" : "text-stone-500"}`}>
              {n === 1 ? "I tuoi dati" : "La tua attività"}
            </span>
          </li>
        ))}
      </ol>

      {erroreGlobale && (
        <div className="mb-5">
          <Alert>{erroreGlobale}</Alert>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={avanti} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Nome"
              autoComplete="given-name"
              value={dati.nome}
              onChange={(e) => set("nome", e.target.value)}
              error={errori.nome}
              required
            />
            <Field
              label="Cognome"
              autoComplete="family-name"
              value={dati.cognome}
              onChange={(e) => set("cognome", e.target.value)}
              error={errori.cognome}
              required
            />
          </div>
          <Field
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nome@esempio.it"
            value={dati.email}
            onChange={(e) => set("email", e.target.value)}
            error={errori.email}
            required
          />
          <Field
            label="Telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+39 333 1234567"
            value={dati.telefono}
            onChange={(e) => set("telefono", e.target.value)}
            error={errori.telefono}
          />
          <PasswordField
            label="Password"
            autoComplete="new-password"
            placeholder="Minimo 8 caratteri"
            value={dati.password}
            onChange={(e) => set("password", e.target.value)}
            error={errori.password}
            required
          />
          <PasswordField
            label="Conferma password"
            autoComplete="new-password"
            value={dati.confermaPassword}
            onChange={(e) => set("confermaPassword", e.target.value)}
            error={errori.confermaPassword}
            required
          />
          <button type="submit" className="btn-primary">
            Continua
          </button>
        </form>
      ) : (
        <form onSubmit={registra} className="space-y-5" noValidate>
          <Field
            label="Codice del tuo Sponsor (Upline)"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="Es. K7M2QX"
            maxLength={6}
            value={dati.codiceSponsor}
            onChange={(e) => set("codiceSponsor", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            error={errori.codiceSponsor ?? (sponsor.stato === "non_valido" ? "Codice sponsor non trovato" : null)}
            hint={
              sponsor.stato === "verifica" ? (
                "Verifica in corso…"
              ) : sponsor.stato === "valido" ? (
                <span className="font-medium text-emerald-700">✓ Sponsor: {sponsor.nome}</span>
              ) : (
                "Chiedi il codice di 6 caratteri alla persona che ti ha invitato"
              )
            }
            required
          />
          <Field
            label="Link della tua Vetrina doTERRA"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://www.doterra.com/IT/it_IT/..."
            value={dati.linkVetrina}
            onChange={(e) => set("linkVetrina", e.target.value)}
            error={errori.linkVetrina}
            required
          />
          <Field
            label="URL del tuo calendario Zoom"
            type="url"
            inputMode="url"
            placeholder="https://scheduler.zoom.us/..."
            value={dati.urlZoom}
            onChange={(e) => set("urlZoom", e.target.value)}
            error={errori.urlZoom}
            hint="Facoltativo: potrai aggiungerlo in seguito"
          />
          <div>
            <label className="flex items-start gap-3 text-sm text-stone-700">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-stone-300 accent-teal-700"
                checked={dati.privacy}
                onChange={(e) => set("privacy", e.target.checked)}
              />
              <span>Accetto l&apos;informativa sulla privacy e il trattamento dei miei dati personali.</span>
            </label>
            {errori.privacy && <p className="mt-1.5 text-sm text-rose-600">{errori.privacy}</p>}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)} disabled={loading}>
              Indietro
            </button>
            <button type="submit" className="btn-primary" disabled={loading || sponsor.stato === "verifica"}>
              {loading ? <Spinner /> : null}
              {loading ? "Creazione account…" : "Crea account"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
