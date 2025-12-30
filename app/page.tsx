import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  // Vérification Auth
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center font-sans">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            LingoDeck <span className="text-indigo-600">Med</span>
          </h1>
          <p className="text-slate-500">Choisis ta langue de travail.</p>
        </div>

        <div className="grid gap-4">
          {/* ANGLAIS */}
          <Link
            href="/en"
            className="group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all flex items-center gap-4"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">
              🇬🇧
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Anglais Médical
              </h2>
              <p className="text-sm text-slate-400">English</p>
            </div>
            <div className="absolute right-6 text-slate-300 group-hover:text-indigo-500">
              →
            </div>
          </Link>

          {/* ESPAGNOL */}
          <Link
            href="/es"
            className="group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-orange-500 hover:shadow-md transition-all flex items-center gap-4"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">
              🇪🇸
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Espagnol Médical
              </h2>
              <p className="text-sm text-slate-400">Español</p>
            </div>
            <div className="absolute right-6 text-slate-300 group-hover:text-orange-500">
              →
            </div>
          </Link>

          {/* ALLEMAND */}
          <Link
            href="/de"
            className="group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-yellow-500 hover:shadow-md transition-all flex items-center gap-4"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">
              🇩🇪
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Allemand Médical
              </h2>
              <p className="text-sm text-slate-400">Deutsch</p>
            </div>
            <div className="absolute right-6 text-slate-300 group-hover:text-yellow-500">
              →
            </div>
          </Link>
        </div>

        <div className="text-center pt-8">
          <Link
            href="/profile"
            className="text-sm font-medium text-slate-400 hover:text-indigo-600 transition-colors"
          >
            Gérer mon profil & Déconnexion
          </Link>
        </div>
      </div>
    </div>
  );
}
