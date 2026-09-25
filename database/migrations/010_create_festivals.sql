CREATE TABLE festivals (
  id text PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL,
  province text NOT NULL,
  region text NOT NULL,
  island_group text NOT NULL CHECK (island_group IN ('Luzon', 'Visayas', 'Mindanao')),
  typical_month smallint NOT NULL CHECK (typical_month BETWEEN 1 AND 12),
  schedule_status text NOT NULL CHECK (
    schedule_status IN ('recurring', 'confirmed', 'estimated', 'cancelled', 'unknown')
  ),
  festival_data jsonb NOT NULL CHECK (jsonb_typeof(festival_data) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX festivals_region_idx ON festivals (region);
CREATE INDEX festivals_typical_month_idx ON festivals (typical_month);
CREATE INDEX festivals_schedule_status_idx ON festivals (schedule_status);

CREATE TABLE festival_cultural_guides (
  festival_id text PRIMARY KEY REFERENCES festivals(id) ON DELETE CASCADE,
  guide_data jsonb NOT NULL CHECK (jsonb_typeof(guide_data) = 'object'),
  last_reviewed_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX festival_cultural_guides_reviewed_idx
  ON festival_cultural_guides (last_reviewed_at DESC);
