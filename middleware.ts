import { NextResponse, type NextRequest } from "next/server";

// Les langues supportées par ton app
const SUPPORTED_LOCALES = ["en", "es", "de"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ignorer les fichiers statiques (images, css) et les appels API internes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // fichiers avec extension (favicon.ico, etc.)
  ) {
    return NextResponse.next();
  }

  // 2. Vérifier si l'URL contient déjà une langue (ex: /en/dashboard)
  const pathnameHasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // 3. Gestion de la page d'accueil racine (/)
  if (pathname === "/") {
    // Vérifier si un cookie de préférence existe
    const localeCookie = request.cookies.get("last_language_preference");

    // Si on a un cookie valide (ex: 'en'), on redirige directement
    if (localeCookie && SUPPORTED_LOCALES.includes(localeCookie.value)) {
      return NextResponse.redirect(
        new URL(`/${localeCookie.value}`, request.url)
      );
    }

    // Sinon, on laisse passer vers la page d'accueil (le menu de choix)
    return NextResponse.next();
  }

  // Pour toute autre route non gérée, on laisse passer (ou on pourrait rediriger vers 404)
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Appliquer le middleware sur tout sauf les fichiers internes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
