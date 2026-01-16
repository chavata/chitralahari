import { NextResponse } from "next/server";
import { buildTitleShape, createDailyPuzzleForToday, getTodayPuzzle } from "../_utils/db";

function todayDateString(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET() {
  try {
    const dateStr = todayDateString();
    let { daily, movie } = await getTodayPuzzle(dateStr);

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

