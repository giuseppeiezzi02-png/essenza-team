import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { errore?: string };
}) {
  return (
    <AuthShell
      title="Bentornato!"
      subtitle="Accedi alla tua area consulente"
      footer={
        <>
          Non hai ancora un account?{" "}
          <Link href="/registrazione" className="font-semibold text-teal-700 hover:underline">
            Registrati
          </Link>
        </>
      }
    >
      <LoginForm linkErrato={searchParams.errore === "link"} />
    </AuthShell>
  );
}
