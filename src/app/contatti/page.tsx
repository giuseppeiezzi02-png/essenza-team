import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import ContattiForm from "./ContattiForm";

export const metadata: Metadata = { title: "Contattaci" };

export default function ContattiPage() {
  return (
    <AuthShell title="Scopri gli oli essenziali doTERRA" subtitle="Lasciaci i tuoi contatti: un consulente ti scriverà a breve">
      <ContattiForm />
    </AuthShell>
  );
}
