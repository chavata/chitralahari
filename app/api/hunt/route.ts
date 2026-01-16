import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { buildTitleShape } from "../_utils/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!supabase) throw new Error("Supabase not configured");

    const url = new URL(req.url);
    const pool = url.searchParams.get("pool") ?? "all";
    const maxLenParam = url.searchParams.get("maxLen");
    const maxLen = maxLenParam ? Number(maxLenParam) : null;
    const limit = pool === "popular" ? 1000 : 4000;

    // Pull a large pool and pick a random movie (no length/popularity limits here).
    const { data: movies, error } = await supabase
      .from("movies")
      .select("id, tmdb_id, title, release_year, normalized_title, poster_path")
      .order("popularity", { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!movies || movies.length === 0) throw new Error("No movies available");

    const filtered =
      maxLen && Number.isFinite(maxLen)
        ? movies.filter(m => {
            const letters = (m.normalized_title ?? "").replace(/\s+/g, "").length;
            return letters >= 1 && letters <= maxLen;
          })
        : movies;

    const poolToUse = filtered.length > 0 ? filtered : movies;

    const pick = poolToUse[Math.floor(Math.random() * poolToUse.length)] as {
      tmdb_id: number;
      title: string;
      release_year: number | null;
      poster_path: string | null;
    };

    return NextResponse.json({
      mode: "hunt",
      date: new Date().toISOString().slice(0, 10),
      year: pick.release_year ?? null,
      titleShape: buildTitleShape(pick.title),
      tmdbId: pick.tmdb_id,
      posterPath: pick.poster_path ?? null,
      answerTitle: pick.title,
      maxGuesses: 5
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("hunt error", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
