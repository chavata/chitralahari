import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { compareTitlesWordleStyle } from "../_utils/wordle";
import { getTodayPuzzle } from "../_utils/db";

function todayDateString(timeZone?: string): string {
  const now = new Date();
  const safeZone = timeZone ?? "UTC";
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: safeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(now);
  }
  const year = parts.find(p => p.type === "year")?.value ?? "1970";
  const month = parts.find(p => p.type === "month")?.value ?? "01";
  const day = parts.find(p => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!supabase) throw new Error("Supabase not configured");
    const body = await req.json();
    const tmdbId = body.tmdbId as number | undefined;
    const tz = (body.timeZone as string | undefined) ?? undefined;
    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
    }

    const dateStr = todayDateString(tz);
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

