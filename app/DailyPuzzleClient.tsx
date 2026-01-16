"use client";

import { useEffect, useState } from "react";
import {
  compareTitlesWordleStyle,
  normalizeTeluguTitle,
  type TileColor
} from "./api/_utils/wordle";

type PuzzleInfo = {
  date: string;
  year: number | null;
  titleShape: string;
  tmdbId: number;
  posterPath: string | null;
  answerTitle: string;
  maxGuesses: number;
  mode?: "daily" | "hunt";
};

type GuessRow = {
  movieId: number;
  title: string;
  colors: TileColor[];
};

type MovieOption = {
  id: number;
  tmdbId: number;
  title: string;
  year: number | null;
  length: number;
};

export default function DailyPuzzleClient() {
  const [puzzle, setPuzzle] = useState<PuzzleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<MovieOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieOption | null>(null);
  const [credits, setCredits] = useState<{ director: string | null; cast: string[] } | null>(
    null
  );
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [providers, setProviders] = useState<{
    link: string | null;
    flatrate: string[];
    rent: string[];
    buy: string[];
  } | null>(null);
  const [providersLoading, setProvidersLoading] = useState(false);

  const [guesses, setGuesses] = useState<GuessRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [streak, setStreak] = useState(0);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const [mode, setMode] = useState<"daily" | "hunt">("daily");
  const [huntNonce, setHuntNonce] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZone(tz || "UTC");
  }, []);

  useEffect(() => {
    async function loadPuzzle() {
      try {
        setLoading(true);
        setError(null);
        setStatus(null);
        setShowResultModal(false);
        setSelectedMovie(null);
        setSearch("");
        setSearchResults([]);
        setGuesses([]);
        setHasWon(false);
        setCredits(null);
        setProviders(null);

        const url =
          mode === "daily"
            ? `/api/daily?tz=${encodeURIComponent(timeZone ?? "UTC")}`
            : "/api/hunt";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load puzzle");
        const data = await res.json();
        setPuzzle({ ...data, mode });
      } catch (e) {
        console.error(e);
        setError("Puzzle failed to load. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    if (mode === "daily") {
      if (timeZone) loadPuzzle();
    } else {
      loadPuzzle();
    }
  }, [timeZone, mode, huntNonce]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("chitralahari-streak");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          streak: number;
          lastDate: string;
          lastWon: boolean;
        };
        if (parsed && typeof parsed.streak === "number") {
          setStreak(parsed.streak);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const id = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/search?query=${encodeURIComponent(search.trim())}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        setSearchResults(data.results);
      } catch (e) {
        if ((e as any).name !== "AbortError") {
          console.error(e);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(id);
    };
  }, [search]);

  const maxGuesses = puzzle?.maxGuesses ?? 5;
  const isGameOver = hasWon || guesses.length >= maxGuesses;
  const showDirector = mode === "daily" && guesses.length >= 3;
  const showCast = mode === "daily" && guesses.length >= 4;

  useEffect(() => {
    if (!puzzle) return;
    if ((showDirector || showCast || (isGameOver && mode === "daily")) && !credits && !creditsLoading) {
      loadCredits(puzzle.tmdbId);
    }
  }, [puzzle, showDirector, showCast, credits, creditsLoading, isGameOver, mode]);

  useEffect(() => {
    if (!puzzle) return;
    if (mode === "daily" && isGameOver && !providers && !providersLoading) {
      loadProviders(puzzle.tmdbId);
    }
  }, [puzzle, isGameOver, providers, providersLoading, mode]);


  async function handleGuess(movie: MovieOption) {
    if (!puzzle || submitting) return;
    if (guesses.length >= puzzle.maxGuesses) return;

    setSubmitting(true);
    setStatus(null);
    try {
      let colors: TileColor[] = [];
      let correct = false;

      if (mode === "daily") {
        const res = await fetch("/api/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: movie.tmdbId,
            timeZone: timeZone ?? "UTC"
          })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Guess failed");
        }
        const data = await res.json();
        colors = data.colors;
        correct = data.correct;
      } else {
        const result = compareTitlesWordleStyle(
          puzzle.answerTitle,
          movie.title
        );
        colors = result.colors;
        correct = result.correct;
      }

      const row: GuessRow = {
        movieId: movie.id,
        title: movie.title,
        colors
      };
      const nextGuesses = [...guesses, row];
      setGuesses(nextGuesses);

      if (correct) {
        setStatus(
          `Correct! The movie was ${movie.title} (${answerLetterCount} letters).`
        );
        setHasWon(true);
        updateStreak(true);
        setShowConfetti(true);
        setShowResultModal(true);
        window.setTimeout(() => setShowConfetti(false), 4200);
      } else if (nextGuesses.length >= puzzle.maxGuesses) {
        setStatus(
          `Out of guesses. The movie was ${puzzle.answerTitle} (${answerLetterCount} letters). Come back tomorrow for a new one.`
        );
        updateStreak(false);
        setShowResultModal(true);
      }
    } catch (e) {
      console.error(e);
      setStatus((e as Error).message);
    } finally {
      setSubmitting(false);
      setSearch("");
      setSearchResults([]);
      setSelectedMovie(null);
    }
  }

  function updateStreak(won: boolean) {
    if (typeof window === "undefined" || !puzzle) return;
    const today = puzzle.date;
    const raw = window.localStorage.getItem("chitralahari-streak");
    let next = 0;
    try {
      if (raw) {
        const parsed = JSON.parse(raw) as {
          streak: number;
          lastDate: string;
          lastWon: boolean;
        };
        const lastDate = parsed?.lastDate;
        const lastWon = parsed?.lastWon;
        const lastStreak = parsed?.streak ?? 0;
        const yesterday = new Date(`${today}T00:00:00Z`);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yStr = yesterday.toISOString().slice(0, 10);
        if (won && lastWon && lastDate === yStr) next = lastStreak + 1;
        else if (won) next = 1;
        else next = 0;
      } else {
        next = won ? 1 : 0;
      }
    } catch {
      next = won ? 1 : 0;
    }
    window.localStorage.setItem(
      "chitralahari-streak",
      JSON.stringify({ streak: next, lastDate: today, lastWon: won })
    );
    setStreak(next);
  }

  async function loadCredits(tmdbId: number) {
    setCreditsLoading(true);
    try {
      const res = await fetch(`/api/credits?tmdbId=${tmdbId}`);
      if (!res.ok) throw new Error("credits failed");
      const data = await res.json();
      setCredits(data);
    } catch (e) {
      console.error(e);
      setCredits(null);
    } finally {
      setCreditsLoading(false);
    }
  }

  async function loadProviders(tmdbId: number) {
    setProvidersLoading(true);
    try {
      const res = await fetch(`/api/providers?tmdbId=${tmdbId}`);
      if (!res.ok) throw new Error("providers failed");
      const data = await res.json();
      setProviders(data);
    } catch (e) {
      console.error(e);
      setProviders(null);
    } finally {
      setProvidersLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center text-sm text-slate-300">Loading…</div>;
  }
  if (error) {
    return <div className="text-center text-sm text-red-400">{error}</div>;
  }
  if (!puzzle) return null;

  const remaining = puzzle.maxGuesses - guesses.length;
  const showDirector = guesses.length >= 3;
  const showCast = guesses.length >= 4;
  const wordLengths = puzzle.titleShape
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.length);
  const totalLetters = wordLengths.reduce((sum, n) => sum + n, 0);
  const answerLetterCount = Array.from(
    normalizeTeluguTitle(puzzle.answerTitle)
  ).filter(ch => ch !== " ").length;
  const formattedDate = (() => {
    const [y, m, d] = puzzle.date.split("-").map(Number);
    if (!y || !m || !d) return puzzle.date;
    const localDate = new Date(y, m - 1, d);
    return localDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  })();

  const posterUrl = puzzle.posterPath
    ? `https://image.tmdb.org/t/p/w342${puzzle.posterPath}`
    : null;

  function buildShareText() {
    if (!puzzle) return "";
    const url =
      (typeof window !== "undefined" && window.location.origin) ||
      "https://wtwchitralahari.netlify.app";
    const rows = guesses.map(g =>
      g.colors
        .map(c => (c === "green" ? "🟩" : c === "yellow" ? "🟨" : "⬛"))
        .join("")
    );
    const attempts = hasWon ? guesses.length : "X";
    return [
      `Chitralahari ${formattedDate}`,
      `Result: ${attempts}/${puzzle.maxGuesses}`,
      "",
      ...rows,
      "",
      `Streak: ${streak}`,
      url
    ].join("\n");
  }

  async function handleShare() {
    const text = buildShareText();
    try {
      const url =
        (typeof window !== "undefined" && window.location.href) ||
        "https://wtwchitralahari.netlify.app";
      if (navigator.share) {
        await navigator.share({
          title: "Chitralahari",
          text,
          url
        });
        setShareStatus("Shared!");
      } else {
        await navigator.clipboard.writeText(text);
        setShareStatus("Copied!");
      }
      window.setTimeout(() => setShareStatus(null), 1500);
    } catch {
      setShareStatus("Copy failed");
      window.setTimeout(() => setShareStatus(null), 1500);
    }
  }


  return (
    <section className="space-y-6">
      {showConfetti && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 100 }).map((_, i) => {
            const left = Math.random() * 100;
            const startY = Math.random() * 100;
            const color = ["#22c55e", "#facc15", "#60a5fa", "#f97316", "#f472b6"][
              i % 5
            ];
            const dx = (Math.random() * 240 - 120).toFixed(0);
            const dur = 3200 + Math.random() * 1400;
            const delay = Math.random() * 600;
            const shape = i % 3 === 0 ? "petal" : "";
            return (
              <span
                key={i}
                className={`confetti-piece ${shape}`}
                style={{
                  left: `${left}%`,
                  top: `${startY}%`,
                  backgroundColor: color,
                  ["--x" as any]: "0px",
                  ["--y" as any]: "0px",
                  ["--dx" as any]: `${dx}px`,
                  ["--dur" as any]: `${Math.round(dur)}ms`,
                  ["--delay" as any]: `${Math.round(delay)}ms`
                }}
              />
            );
          })}
        </div>
      )}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
        <div className="flex justify-between text-xs text-slate-400">
          <span>
            {mode === "daily" ? `Date: ${formattedDate}` : "Mode: Highscore Hunts"}
          </span>
          {puzzle.year && <span>Year of release: {puzzle.year}</span>}
        </div>
        <div className="text-sm text-slate-200 flex flex-wrap gap-2 items-center">
          <span>Title shape:</span>
          <span className="font-mono tracking-widest">{puzzle.titleShape}</span>
          <span className="text-xs text-slate-400">({totalLetters} letters)</span>
        </div>
        <div className="text-xs text-slate-400">
          Guesses remaining: {remaining}
        </div>
        {(showDirector || showCast) && (
          <div className="text-xs text-slate-300 space-y-1">
            {creditsLoading && <div>Loading hints…</div>}
            {!creditsLoading && credits && (showDirector || showCast) && (
              <div>
                {showDirector && (
                  <>
                    Director:{" "}
                    <span className="text-slate-100">
                      {credits.director ?? "N/A"}
                    </span>
                  </>
                )}
                {showCast && (
                  <>
                    {" "}
                    | Cast:{" "}
                    <span className="text-slate-100">
                      {credits.cast.slice(0, 1).join(", ")}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("daily")}
            className={`px-2 py-1 rounded-md border ${
              mode === "daily"
                ? "border-cyan-400 text-cyan-200"
                : "border-slate-700 text-slate-300"
            }`}
          >
            Daily Dose
          </button>
          <button
            onClick={() => setMode("hunt")}
            className={`px-2 py-1 rounded-md border ${
              mode === "hunt"
                ? "border-cyan-400 text-cyan-200"
                : "border-slate-700 text-slate-300"
            }`}
          >
            Highscore Hunts
          </button>
        </div>
        {mode === "hunt" && (
          <button
            onClick={() => setHuntNonce(prev => prev + 1)}
            className="px-2 py-1 rounded-md border border-slate-700 text-slate-300"
          >
            New Hunt
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:p-5 space-y-4">
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map(rowIndex => {
            const rowGuess = guesses[rowIndex];
            const isPreview = !rowGuess && selectedMovie && rowIndex === guesses.length;
            const colorsRaw = rowGuess?.colors ?? [];
            const normLetters = rowGuess
              ? Array.from(normalizeTeluguTitle(rowGuess.title))
              : isPreview
              ? Array.from(normalizeTeluguTitle(selectedMovie.title))
              : [];
            // Remove spaces from both letters and colors so tiles never show gaps.
            const letters: string[] = [];
            const colors: TileColor[] = [];
            normLetters.forEach((ch, idx) => {
              if (ch !== " ") {
                letters.push(ch);
                colors.push(colorsRaw[idx] ?? "gray");
              }
            });
            return (
              <div key={rowIndex} className="flex justify-center">
                {wordLengths.map((len, wordIndex) => {
                  const startIndex =
                    wordLengths.slice(0, wordIndex).reduce((a, b) => a + b, 0);
                  return (
                    <div
                      key={wordIndex}
                      className="flex gap-1"
                      style={{
                        marginRight:
                          wordIndex < wordLengths.length - 1
                            ? "clamp(8px, 3vw, 20px)"
                            : 0
                      }}
                    >
                      {Array.from({ length: len }).map((_, offset) => {
                        const colIndex = startIndex + offset;
                        const color = colors[colIndex];
                        const ch = letters[colIndex] ?? "";
                        let bg =
                          "bg-slate-900 border border-slate-600 text-slate-200";
                        if (color === "green") bg = "bg-green-500 text-black";
                        else if (color === "yellow")
                          bg = "bg-yellow-400 text-black";
                        else if (color === "gray")
                          bg = "bg-slate-700 text-slate-100";
                        if (isPreview) {
                          bg = "bg-slate-800 border border-slate-600 text-slate-100";
                        }

                        const isRevealed =
                          color === "green" || color === "yellow" || color === "gray";
                        return (
                          <span
                            key={colIndex}
                            className={`tile w-8 h-8 text-sm md:w-10 md:h-10 md:text-lg rounded-md font-bold flex items-center justify-center ${
                              isRevealed ? "revealed" : ""
                            } ${bg}`}
                            style={{
                              animationDelay: isRevealed ? `${offset * 40}ms` : undefined
                            }}
                          >
                            {ch}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {status && (
          <div className="text-xs text-center text-cyan-300 mt-4">{status}</div>
        )}
      </div>

      {isGameOver && showResultModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900/95 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-slate-100">
                {mode === "daily" ? "Movie of the day" : "Hunt result"}
              </div>
              <button
                onClick={() => setShowResultModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                Close
              </button>
            </div>
            <div className="mt-4 flex gap-4 items-start">
              {posterUrl && (
                <img
                  src={posterUrl}
                  alt={puzzle.answerTitle}
                  className="w-24 h-auto rounded-md border border-slate-700"
                />
              )}
              <div className="flex-1 space-y-2">
                <div className="text-lg font-semibold">{puzzle.answerTitle}</div>
                {puzzle.year && (
                  <div className="text-xs text-slate-400">
                    Year of release: {puzzle.year}
                  </div>
                )}
                <div className="text-xs text-slate-400">Streak: {streak}</div>
                {!creditsLoading && credits && (
                  <div className="text-xs text-slate-400">
                    Director:{" "}
                    <span className="text-slate-100">
                      {credits.director ?? "N/A"}
                    </span>
                    {credits.cast.length > 0 && (
                      <>
                        {" "}
                        | Cast:{" "}
                        <span className="text-slate-100">
                          {credits.cast.slice(0, 3).join(", ")}
                        </span>
                      </>
                    )}
                  </div>
                )}
                {creditsLoading && (
                  <div className="text-xs text-slate-400">Loading cast &amp; crew…</div>
                )}
                <div className="text-xs text-slate-400">
                  Streaming:
                  {providersLoading && <span className="ml-2">Loading…</span>}
                  {!providersLoading && providers && (
                    <span className="ml-2 text-slate-100">
                      {providers.flatrate.length > 0
                        ? `Watch on ${providers.flatrate.slice(0, 3).join(", ")}`
                        : providers.rent.length > 0
                        ? `Rent on ${providers.rent.slice(0, 3).join(", ")}`
                        : providers.buy.length > 0
                        ? `Buy on ${providers.buy.slice(0, 3).join(", ")}`
                        : "Not available"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={handleShare}
                className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-900 text-xs font-semibold hover:bg-white"
              >
                Share
              </button>
              {shareStatus && (
                <span className="text-xs text-slate-400">{shareStatus}</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="text-xs text-slate-400">
          Search for a Telugu movie title, pick one, then press Submit to confirm.
        </div>
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Type a Telugu movie title…"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-400 disabled:opacity-60"
            disabled={isGameOver}
          />
          {selectedMovie && (
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {selectedMovie.length} letters
            </span>
          )}
          <button
            onClick={() => selectedMovie && handleGuess(selectedMovie)}
            className="px-4 py-2 rounded-md bg-cyan-500 text-slate-900 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedMovie || submitting || isGameOver}
          >
            Submit
          </button>
        </div>
        {selectedMovie && (
          <div className="flex justify-center">
            <button
              onClick={() => {
                setSelectedMovie(null);
                setSearch("");
                setSearchResults([]);
                setCredits(null);
                setCreditsLoading(false);
              }}
              className="px-3 py-1.5 rounded-md border border-slate-600 text-xs text-slate-300 hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        )}
        {searchLoading && (
          <div className="text-xs text-slate-400">Searching…</div>
        )}
        {searchResults.length > 0 &&
          (!selectedMovie || search !== selectedMovie.title) && (
          <ul className="max-h-64 overflow-y-auto text-sm divide-y divide-slate-800 rounded-md border border-slate-800 bg-slate-950/90">
            {searchResults.map(m => (
              <li
                key={m.id}
                className="px-3 py-2 hover:bg-slate-800 cursor-pointer flex justify-between gap-3 items-center"
                onClick={() => {
                  setSelectedMovie(m);
                  setSearch(m.title);
                  setSearchResults([]);
                }}
              >
                <div className="flex flex-col">
                  <span>{m.title}</span>
                  <span className="text-[11px] text-slate-500">
                    {m.length} letters
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 whitespace-nowrap">
                  {m.year ?? ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

