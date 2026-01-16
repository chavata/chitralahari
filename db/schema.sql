create table if not exists movies (
  id bigserial primary key,
  tmdb_id integer unique not null,
  title text not null,
  original_title text,
  original_language text,
  release_year integer,
  normalized_title text generated always as (
    lower(regexp_replace(title, '[\s\.,!?؛:;''"“”‘’\-–—(){}\[\]\/\\|@#$%^&*+=<>~`。、！？]+', ' ', 'g'))
  ) stored,
  poster_path text,
  backdrop_path text,
  popularity real,
  created_at timestamptz default now()
);

create table if not exists daily_puzzles (
  id bigserial primary key,
  puzzle_date date not null unique,
  movie_id bigint not null references movies(id),
  answer_title text not null,
  answer_normalized text not null,
  created_at timestamptz default now()
);

