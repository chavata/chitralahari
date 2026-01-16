import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { searchTeluguMovies } from "../_utils/tmdb";
import { upsertMovieFromTmdb } from "../_utils/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!supabase) throw new Error("Supabase not configured");
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("query") ?? "").trim();
    if (!query) {
      return NextResponse.json({ results: [] });
    }
    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // 1) Search our local movies table
    const { data: local, error: localError } = await supabase
      .from("movies")
      .select("id, tmdb_id, title, release_year, normalized_title, original_title")
      .or(`title.ilike.%${query}%,original_title.ilike.%${query}%`)
      .order("popularity", { ascending: false })
      .limit(20);

    if (localError) throw localError;

    let movies = local ?? [];

    // 2) If we have very few local results, fall back to TMDb search (slower)
    if (movies.length < 5) {
      const tmdb = await searchTeluguMovies(query, 1);

      // Upsert a handful of TMDb results into Supabase for future use
      const teluguOnly = tmdb.results.filter(
        m => (m.original_language ?? "").toLowerCase() === "te"
      );
      const top = teluguOnly.slice(0, 10);
      for (const m of top) {
        await upsertMovieFromTmdb(m);
      }

      // Re-query Supabase so we return consistent rows with IDs
      const { data: afterUpsert, error: afterError } = await supabase
        .from("movies")
        .select("id, tmdb_id, title, release_year, normalized_title, original_title")
        .ilike("title", `%${query}%`)
        .order("popularity", { ascending: false })
        .limit(20);

      if (afterError) throw afterError;
      movies = afterUpsert ?? movies;
    }

    const results =
      movies?.map(m => {
        const norm =
          (m.normalized_title as string | null) ?? (m.title as string);
        const letters = Array.from(norm).filter(ch => ch !== " ").length;
        return {
          id: m.id as number,
          tmdbId: m.tmdb_id as number,
          title: m.title as string,
          year: (m.release_year as number | null) ?? null,
          length: letters
        };
      }) ?? [];

    return NextResponse.json({ results });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("search error", e);
    return NextResponse.json(
      { error: (e as Error).message, results: [] },
      { status: 500 }
    );
  }
}


