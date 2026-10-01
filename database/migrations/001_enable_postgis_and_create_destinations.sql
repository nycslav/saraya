CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE destinations (
  id text PRIMARY KEY,
  name text NOT NULL,
  province text NOT NULL,
  region text NOT NULL,
  island_group text NOT NULL CHECK (island_group IN ('Luzon', 'Visayas', 'Mindanao')),
  category text NOT NULL CHECK (category IN ('Beach', 'Culture', 'Food', 'Heritage', 'Mountain', 'Nature')),
  rating numeric(2, 1) NOT NULL CHECK (rating BETWEEN 0 AND 5),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  summary text NOT NULL,
  description text NOT NULL,
  hero_tone text NOT NULL CHECK (hero_tone IN ('sky', 'sunset', 'forest', 'lagoon', 'violet', 'gold')),
  tags text[] NOT NULL CHECK (cardinality(tags) > 0),
  highlights text[] NOT NULL CHECK (cardinality(highlights) > 0),
  best_for text[] NOT NULL CHECK (cardinality(best_for) > 0),
  thumbnail_image_url text,
  photos text[] NOT NULL DEFAULT '{}',
  is_hidden_gem boolean NOT NULL DEFAULT false,
  location geography(Point, 4326) NOT NULL,
  historical_context text NOT NULL,
  etiquette text[] NOT NULL CHECK (cardinality(etiquette) > 0),
  local_phrase text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX destinations_location_gix ON destinations USING gist (location);
CREATE INDEX destinations_region_idx ON destinations (region);
CREATE INDEX destinations_island_group_idx ON destinations (island_group);
CREATE INDEX destinations_tags_gin ON destinations USING gin (tags);
