export const IMPORTO_MIN_CENTS = 1000;
export const IMPORTO_MAX_CENTS = 500000;
export const IMPORTI_RAPIDI = [50, 100, 250];

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export const formatEuro = (cents: number) => euro.format(cents / 100);

const data = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" });
export const formatData = (iso: string) => data.format(new Date(iso));

export function euroInCents(value: string): number | null {
  const n = Number(value.replace(",", ".").trim());
  return Number.isFinite(n) && value.trim() !== "" ? Math.round(n * 100) : null;
}

export function validaImporto(cents: number | null): string | null {
  if (cents === null || !Number.isInteger(cents)) return "Inserisci un importo valido";
  if (cents < IMPORTO_MIN_CENTS) return `L'importo minimo è ${formatEuro(IMPORTO_MIN_CENTS)}`;
  if (cents > IMPORTO_MAX_CENTS) return `L'importo massimo è ${formatEuro(IMPORTO_MAX_CENTS)}`;
  return null;
}

export type DatiCarta = { numero: string; scadenza: string; cvc: string };

export function validaCarta({ numero, scadenza, cvc }: DatiCarta, oggi = new Date()): string | null {
  if (!/^\d{12,19}$/.test(numero.replace(/\s/g, ""))) return "Numero di carta non valido";
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(scadenza.trim());
  if (!m) return "Scadenza non valida (MM/AA)";
  const fineMese = new Date(2000 + Number(m[2]), Number(m[1]), 1);
  if (fineMese <= oggi) return "La carta è scaduta";
  if (!/^\d{3,4}$/.test(cvc.trim())) return "CVC non valido";
  return null;
}

// Pagamento simulato con le carte di test di Stripe: nessun addebito reale.
// Per Stripe vero: Checkout + webhook che chiama accredita_budget_ads con provider 'stripe'.
export function simulaPagamento(carta: DatiCarta): { ok: true } | { ok: false; errore: string } {
  const errore = validaCarta(carta);
  if (errore) return { ok: false, errore };
  switch (carta.numero.replace(/\s/g, "")) {
    case "4242424242424242":
    case "5555555555554444":
      return { ok: true };
    case "4000000000000002":
      return { ok: false, errore: "La carta è stata rifiutata." };
    case "4000000000009995":
      return { ok: false, errore: "Fondi insufficienti sulla carta." };
    default:
      return { ok: false, errore: "Modalità simulazione: usa la carta di test 4242 4242 4242 4242." };
  }
}
