import { NextResponse } from "next/server";
import { simulaPagamento, validaImporto } from "@/lib/ads";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errore: "Sessione scaduta, accedi di nuovo." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const importoCents = Number(body?.importoCents);
  const erroreImporto = validaImporto(Number.isFinite(importoCents) ? importoCents : null);
  if (erroreImporto) return NextResponse.json({ errore: erroreImporto }, { status: 400 });

  const esito = simulaPagamento({
    numero: String(body?.numero ?? ""),
    scadenza: String(body?.scadenza ?? ""),
    cvc: String(body?.cvc ?? ""),
  });
  if (!esito.ok) return NextResponse.json({ errore: esito.errore }, { status: 402 });

  const { data, error } = await createAdminClient()
    .rpc("accredita_budget_ads", {
      p_consulente_id: user.id,
      p_importo_cents: importoCents,
      p_provider: "simulato",
      p_riferimento: `sim_${crypto.randomUUID()}`,
    })
    .single();
  if (error) {
    console.error("accredita_budget_ads", error);
    return NextResponse.json({ errore: "Pagamento non registrato, riprova." }, { status: 500 });
  }
  return NextResponse.json({ campagna: data });
}
