export const REF_COOKIE = "essenza_ref";
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

export function normalizzaCodice(value: string | null | undefined): string | null {
  const codice = value?.trim().toUpperCase();
  return codice && /^[A-Z0-9]{6}$/.test(codice) ? codice : null;
}
