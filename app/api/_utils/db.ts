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

export async function createDailyPuzzleForToday(dateStr: string): Promise<DailyPuzzleRecord> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: movies, error: moviesErr } = await supabase
    .from("movies")
    .select("*")
    .order("popularity", { ascending: false })
    .limit(500)
    .returns<MovieRecord[]>();
  if (moviesErr) throw moviesErr;
  if (!movies || movies.length === 0) throw new Error("No movies in database");

  // Prefer movies whose titles are purely non-Telugu (English / Latin) so
  // that answers and guesses are in the same script.
  const nonTelugu = movies.filter(m => !containsTelugu(m.title));
  const pool = nonTelugu.length > 0 ? nonTelugu : movies;

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
