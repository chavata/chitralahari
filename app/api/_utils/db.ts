import { supabase } from "@/lib/supabaseClient";
import { titleShapeFromRaw } from "./wordle";

if (!supabase) {
  // eslint-disable-next-line no-console
  console.warn("Supabase client not initialized. Check environment variables.");
}

export type MovieRecord = {
  id: number;
  tmdb_id: number;
  title: string;
  original_title: string | null;
  release_year: number | null;
  normalized_title: string;
};

export type DailyPuzzleRecord = {
  id: number;
  puzzle_date: string;
  movie_id: number;
  answer_title: string;
  answer_normalized: string;
};

export async function upsertMovieFromTmdb(movie: {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  popularity?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
}) {
  if (!supabase) throw new Error("Supabase not configured");
  const releaseYear = movie.release_date ? parseInt(movie.release_date.slice(0, 4), 10) : null;

  const { error } = await supabase.from("movies").upsert(
    {
      tmdb_id: movie.id,
      title: movie.title,
      original_title: movie.original_title,
      release_year: releaseYear,
      popularity: movie.popularity ?? null,
      poster_path: movie.poster_path ?? null,
      backdrop_path: movie.backdrop_path ?? null
    },
    { onConflict: "tmdb_id" }
  );
  if (error) throw error;
}

export async function getTodayPuzzle(dateStr: string): Promise<{
  daily: DailyPuzzleRecord | null;
  movie: MovieRecord | null;
}> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: daily, error: dailyErr } = await supabase
    .from("daily_puzzles")
    .select("*")
    .eq("puzzle_date", dateStr)
    .maybeSingle();

  if (dailyErr && dailyErr.code !== "PGRST116") {
    throw dailyErr;
  }

  if (!daily) return { daily: null, movie: null };

  const { data: movie, error: movieErr } = await supabase
    .from("movies")
    .select("*")
    .eq("id", (daily as DailyPuzzleRecord).movie_id)
    .maybeSingle();
  if (movieErr) throw movieErr;

  return { daily, movie };
}

export async function deleteDailyPuzzle(id: number) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("daily_puzzles").delete().eq("id", id);
  if (error) throw error;
}

export async function createDailyPuzzleForToday(dateStr: string): Promise<DailyPuzzleRecord> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: movies, error: moviesErr } = await supabase
    .from("movies")
    .select("*")
    .order("popularity", { ascending: false })
    .limit(2000)
    .returns<MovieRecord[]>();
  if (moviesErr) throw moviesErr;
  if (!movies || movies.length === 0) throw new Error("No movies in database");

  const launchDate = await getLaunchDate(dateStr);
  const daysSinceLaunch = daysBetween(launchDate, dateStr);
  const popularOnly = daysSinceLaunch < 60;

  const previouslyUsed = await getUsedMovieIds();

  const filtered = movies.filter(m => {
    const letters = (m.normalized_title ?? "").replace(/\s+/g, "").length;
    const lengthOk = letters >= 1 && letters <= 10;
    const notUsed = !previouslyUsed.has(m.id);
    return lengthOk && notUsed;
  });

  const popularPool = popularOnly ? filtered.slice(0, 500) : filtered;
  const pool = popularPool.length > 0 ? popularPool : filtered.length > 0 ? filtered : movies;

  const index = deterministicIndexForDate(dateStr, pool.length);
  const movie = pool[index];

  const { data, error } = await supabase
    .from("daily_puzzles")
    .insert({
      puzzle_date: dateStr,
      movie_id: movie.id,
      answer_title: movie.title,
      answer_normalized: movie.normalized_title
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Failed to create daily puzzle");

  return data as DailyPuzzleRecord;
}

function deterministicIndexForDate(dateStr: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

export function buildTitleShape(title: string): string {
  return titleShapeFromRaw(title);
}

function containsTelugu(input: string): boolean {
  return /[\u0C00-\u0C7F]/.test(input);
}

async function getLaunchDate(fallbackDate: string): Promise<string> {
  if (!supabase) return fallbackDate;
  const { data, error } = await supabase
    .from("daily_puzzles")
    .select("puzzle_date")
    .order("puzzle_date", { ascending: true })
    .limit(1);
  if (error || !data || data.length === 0) return fallbackDate;
  return (data[0] as { puzzle_date: string }).puzzle_date;
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor((end - start) / 86400000));
}

async function getUsedMovieIds(): Promise<Set<number>> {
  if (!supabase) return new Set();
  const { data, error } = await supabase.from("daily_puzzles").select("movie_id");
  if (error || !data) return new Set();
  return new Set(
    data.map(row => (row as { movie_id: number }).movie_id).filter(Boolean)
  );
}

export async function isDailyPuzzleValid(
  dateStr: string,
  daily: DailyPuzzleRecord,
  movie: MovieRecord
): Promise<boolean> {
  if (!supabase) return false;

  const letters = (movie.normalized_title ?? "").replace(/\s+/g, "").length;
  if (letters < 1 || letters > 10) return false;

  const launchDate = await getLaunchDate(dateStr);
  const daysSinceLaunch = daysBetween(launchDate, dateStr);
  const popularOnly = daysSinceLaunch < 60;

  if (popularOnly) {
    const { data, error } = await supabase
      .from("movies")
      .select("id")
      .order("popularity", { ascending: false })
      .limit(500);
    if (error || !data) return false;
    const topIds = new Set(data.map(row => (row as { id: number }).id));
    if (!topIds.has(movie.id)) return false;
  }

  // Ensure no repeats across other dates
  const { data: dupes, error: dupesErr } = await supabase
    .from("daily_puzzles")
    .select("id")
    .eq("movie_id", daily.movie_id)
    .neq("puzzle_date", dateStr)
    .limit(1);
  if (dupesErr) return false;
  if (dupes && dupes.length > 0) return false;

  return true;
}
