import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { normalizzaCodice, REF_COOKIE } from "@/lib/referral";
import RegistrazioneForm from "./RegistrazioneForm";

export const metadata: Metadata = { title: "Registrazione consulente" };

export default function RegistrazionePage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  return (
    <AuthShell
      title="Entra nel team"
      subtitle="Crea il tuo profilo consulente in due passaggi"
      footer={
        <>
          Hai già un account?{" "}
          <Link href="/login" className="font-semibold text-teal-700 hover:underline">
            Accedi
          </Link>
        </>
      }
    >
      <RegistrazioneForm codiceSponsorIniziale={
          normalizzaCodice(searchParams.ref) ?? normalizzaCodice(cookies().get(REF_COOKIE)?.value) ?? ""
        } />
    </AuthShell>
  );
}
