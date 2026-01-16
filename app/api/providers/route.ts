import { NextRequest, NextResponse } from "next/server";
import { tmdbFetch } from "../_utils/tmdb";

export const dynamic = "force-dynamic";

type ProvidersResponse = {
  results: {
    IN?: {
      flatrate?: { provider_name: string }[];
      rent?: { provider_name: string }[];
      buy?: { provider_name: string }[];
      link?: string;
    };
  };
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get("tmdbId");
    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
    }

    const data = await tmdbFetch<ProvidersResponse>(
      `/movie/${tmdbId}/watch/providers`,
      { language: "en-US" }
    );

    const india = data.results.IN ?? {};
    const unique = (arr?: { provider_name: string }[]) =>
      Array.from(new Set((arr ?? []).map(p => p.provider_name)));

    return NextResponse.json({
      link: india.link ?? null,
      flatrate: unique(india.flatrate),
      rent: unique(india.rent),
      buy: unique(india.buy)
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("providers error", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

