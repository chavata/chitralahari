import DailyPuzzleClient from "./DailyPuzzleClient";
import TopBarClient from "./TopBarClient";

export default function HomePage() {
  return (
    <main className="space-y-6">
      <TopBarClient />
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Chitralahari</h1>
        <p className="text-slate-300 text-sm">
          Guess today&apos;s Telugu movie title in 5 attempts. Pick movies from the search bar below.
        </p>
      </header>
      <DailyPuzzleClient />
    </main>
  );
}

