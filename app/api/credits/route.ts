import { NextRequest, NextResponse } from "next/server";
import { tmdbFetch } from "../_utils/tmdb";

type CreditsResponse = {
  cast: { name: string }[];
  crew: { name: string; job: string }[];
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get("tmdbId");
    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
    }

    const credits = await tmdbFetch<CreditsResponse>(`/movie/${tmdbId}/credits`, {
      language: "en-US"
    });

    const director =
      credits.crew.find(member => member.job === "Director")?.name ?? null;
    const cast = credits.cast.slice(0, 5).map(member => member.name);

    return NextResponse.json({ director, cast });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("credits error", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

