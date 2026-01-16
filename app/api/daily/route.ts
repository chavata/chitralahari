import { NextRequest, NextResponse } from "next/server";
import {
  buildTitleShape,
  createDailyPuzzleForToday,
  deleteDailyPuzzle,
  getTodayPuzzle,
  isDailyPuzzleValid
} from "../_utils/db";

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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tz = url.searchParams.get("tz") ?? undefined;
    const force = url.searchParams.get("force") === "1";
    const dateStr = todayDateString(tz);
    let { daily, movie } = await getTodayPuzzle(dateStr);

    if (daily && movie) {
      const valid = await isDailyPuzzleValid(dateStr, daily, movie);
      if (!valid) {
        await deleteDailyPuzzle(daily.id);
        daily = null;
        movie = null;
      }
    }

    if (force && daily) {
      await deleteDailyPuzzle(daily.id);
      daily = null;
      movie = null;
    }

    if (!daily) {
      daily = await createDailyPuzzleForToday(dateStr);
      ({ movie } = await getTodayPuzzle(dateStr));
    }

    if (!movie) throw new Error("Movie for daily puzzle not found");

    const year = movie.release_year;
    const titleShape = buildTitleShape(daily.answer_title);

    return NextResponse.json({
      date: dateStr,
      year,
      titleShape,
      tmdbId: movie.tmdb_id,
      posterPath: (movie as any).poster_path ?? null,
      // We include the answer title so the client can reveal it at game end.
      answerTitle: daily.answer_title,
      maxGuesses: 5
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("daily error", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

