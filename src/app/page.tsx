import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizzaCodice, REF_COOKIE } from "@/lib/referral";
import { createClient } from "@/lib/supabase/server";

export default async function Home({ searchParams }: { searchParams: { ref?: string } }) {
  const codiceLink = normalizzaCodice(searchParams.ref);
  if (codiceLink) redirect(`/c/${codiceLink}`);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const codiceSalvato = normalizzaCodice(cookies().get(REF_COOKIE)?.value);
  redirect(codiceSalvato ? `/c/${codiceSalvato}` : "/login");
}
