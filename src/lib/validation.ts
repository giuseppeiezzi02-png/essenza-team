function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function hostMatches(host: string, domains: string[]) {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

export function validaLinkVetrina(value: string): string | null {
  if (!value.trim()) return "Inserisci il link della tua Vetrina doTERRA";
  const url = parseHttpUrl(value);
  if (!url) return "Inserisci un URL valido (es. https://www.doterra.com/...)";
  if (!hostMatches(url.hostname, ["doterra.com", "doterra.me"]))
    return "Il link deve essere un indirizzo doTERRA";
  return null;
}

export function validaUrlZoom(value: string): string | null {
  if (!value.trim()) return null;
  const url = parseHttpUrl(value);
  if (!url) return "Inserisci un URL valido (es. https://scheduler.zoom.us/...)";
  if (!hostMatches(url.hostname, ["zoom.us", "zoom.com"]))
    return "Il link deve essere un indirizzo Zoom";
  return null;
}

export function validaEmail(value: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : "Email non valida";
}

export function validaPassword(value: string): string | null {
  return value.length >= 8 ? null : "La password deve avere almeno 8 caratteri";
}

export function traduciErroreAuth(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o password non corretti";
  if (m.includes("email not confirmed")) return "Conferma la tua email prima di accedere";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Esiste già un account con questa email";
  if (m.includes("database error saving new user") || m.includes("codice sponsor"))
    return "Codice sponsor non valido";
  if (m.includes("rate limit")) return "Troppi tentativi, riprova tra qualche minuto";
  if (m.includes("password")) return "Password non valida (minimo 8 caratteri)";
  return "Si è verificato un errore, riprova";
}
