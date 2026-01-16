import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { compareTitlesWordleStyle } from "../_utils/wordle";
import { getTodayPuzzle } from "../_utils/db";

function todayDateString(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!supabase) throw new Error("Supabase not configured");
    const body = await req.json();
    const tmdbId = body.tmdbId as number | undefined;
    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
    }

    const dateStr = todayDateString();
    const { daily } = await getTodayPuzzle(dateStr);
    if (!daily) throw new Error("Daily puzzle not found");

    const { data: movie, error: movieErr } = await supabase
      .from("movies")
      .select("id, title")
      .eq("tmdb_id", tmdbId)
      .single();
    if (movieErr) throw movieErr;

    const { colors, correct } = compareTitlesWordleStyle(
      daily.answer_title,
      movie.title as string
    );

    return NextResponse.json({
      colors,
      correct
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("guess error", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

