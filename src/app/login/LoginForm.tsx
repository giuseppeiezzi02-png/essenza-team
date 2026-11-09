"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/Alert";
import Field from "@/components/Field";
import PasswordField from "@/components/PasswordField";
import Spinner from "@/components/Spinner";
import { createClient } from "@/lib/supabase/client";
import { traduciErroreAuth, validaEmail } from "@/lib/validation";

export default function LoginForm({ linkErrato }: { linkErrato?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(
    linkErrato ? "Il link di conferma non è valido o è scaduto" : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    const emailErr = validaEmail(email);
    if (emailErr) return setErrore(emailErr);
    if (!password) return setErrore("Inserisci la password");

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setLoading(false);
      return setErrore(traduciErroreAuth(error.message));
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {errore && <Alert>{errore}</Alert>}
      <Field
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="nome@esempio.it"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <PasswordField
        label="Password"
        autoComplete="current-password"
        placeholder="La tua password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? <Spinner /> : null}
        {loading ? "Accesso in corso…" : "Accedi"}
      </button>
    </form>
  );
}
