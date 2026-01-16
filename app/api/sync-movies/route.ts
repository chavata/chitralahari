import { NextResponse } from "next/server";
import { discoverTeluguMovies } from "../_utils/tmdb";
import { upsertMovieFromTmdb } from "../_utils/db";

// This route is intended to be called from a cron job (e.g. Vercel Cron).

export async function GET() {
  try {
    let page = 1;
    // Import more pages so we cover a much larger Telugu catalog
    const maxPages = 40; // safety cap per run
    let imported = 0;

    // Basic pagination loop
    // You can refine later using a last-synced date if desired.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const data = await discoverTeluguMovies(page);
      for (const m of data.results) {
        await upsertMovieFromTmdb(m);
        imported += 1;
      }
      if (page >= data.total_pages || page >= maxPages) break;
      page += 1;
    }

    return NextResponse.json({ ok: true, imported });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("sync-movies error", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

