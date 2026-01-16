import Link from "next/link";
import DailyPuzzleClient from "../DailyPuzzleClient";

export default function HuntPage() {
  return (
    <main className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          <Link href="/" className="hover:text-cyan-300">
            Chitralahari
          </Link>
        </h1>
      </header>
      <DailyPuzzleClient initialMode="hunt" startInGame />
    </main>
  );
}

