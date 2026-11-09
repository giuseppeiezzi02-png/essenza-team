import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { normalizzaCodice, REF_COOKIE, REF_COOKIE_MAX_AGE } from "@/lib/referral";

const AUTH_PAGES = ["/login", "/registrazione"];
const PROTECTED_PREFIXES = ["/dashboard"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Link del consulente (/c/CODICE o ?ref=CODICE): ricorda il riferimento per le visite successive
  const codiceRef = normalizzaCodice(
    path.startsWith("/c/") ? path.split("/")[2] : request.nextUrl.searchParams.get("ref"),
  );
  const codiceEsiste =
    codiceRef &&
    (await supabase.rpc("verifica_codice_sponsor", { codice: codiceRef })).data?.length;
  if (codiceRef && codiceEsiste) {
    response.cookies.set(REF_COOKIE, codiceRef, {
      maxAge: REF_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  }

  // Il redirect deve portarsi dietro i cookie di sessione eventualmente rinnovati da getUser()
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!user && PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
    return redirectTo("/login");
  }

  if (user && AUTH_PAGES.includes(path)) {
    return redirectTo("/dashboard");
  }

  return response;
}
