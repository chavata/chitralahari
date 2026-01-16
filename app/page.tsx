import Link from "next/link";
import TopBarClient from "./TopBarClient";

export default function HomePage() {
  return (
    <main className="min-h-screen space-y-6">
      <TopBarClient />
      <div className="flex flex-col items-center gap-6 pt-4 md:pt-8">
        <header className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Chitralahari</h1>
        </header>
        <div className="w-full max-w-3xl mx-auto px-2">
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/daily"
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2"
            >
              <div className="text-lg font-semibold text-slate-100">Daily Dose</div>
              <div className="text-sm text-slate-400">
                One movie a day • Title size ≤ 10 letters.
              </div>
              <span className="inline-block px-4 py-2 rounded-md bg-cyan-500 text-slate-900 text-sm font-semibold hover:bg-cyan-400">
                Play Daily
              </span>
            </Link>
            <Link
              href="/hunt"
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2"
            >
              <div className="text-lg font-semibold text-slate-100">
                Highscore Hunts
              </div>
              <div className="text-sm text-slate-400">
                Continuous runs • Score builds until you fail.
              </div>
              <span className="inline-block px-4 py-2 rounded-md bg-cyan-500 text-slate-900 text-sm font-semibold hover:bg-cyan-400">
                Start Hunt
              </span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

