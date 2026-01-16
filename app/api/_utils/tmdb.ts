const TMDB_BASE = "https://api.themoviedb.org/3";

function getTmdbToken(): string {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) {
    throw new Error("TMDB_READ_ACCESS_TOKEN is not set");
  }
  return token;
}

export async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const url = new URL(TMDB_BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getTmdbToken()}`,
      "Content-Type": "application/json;charset=utf-8"
    },
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TMDb error ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

export type TmdbMovie = {
  id: number;
  title: string;
  original_title: string;
  original_language?: string;
  release_date?: string;
  popularity?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
};

export type DiscoverMoviesResponse = {
  page: number;
  total_pages: number;
  results: TmdbMovie[];
};

export async function discoverTeluguMovies(page = 1): Promise<DiscoverMoviesResponse> {
  return tmdbFetch<DiscoverMoviesResponse>("/discover/movie", {
    with_original_language: "te",
    // Use English titles while still restricting to Telugu-language movies.
    language: "en-US",
    sort_by: "popularity.desc",
    page
  });
}

export type SearchMoviesResponse = {
  page: number;
  total_pages: number;
  results: TmdbMovie[];
};

export async function searchTeluguMovies(
  query: string,
  page = 1
): Promise<SearchMoviesResponse> {
  return tmdbFetch<SearchMoviesResponse>("/search/movie", {
    query,
    language: "en-US",
    page,
    include_adult: "false"
  });
}
