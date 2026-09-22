CREATE TABLE safety_alerts (
  id text PRIMARY KEY,
  alert_type text NOT NULL CHECK (
    alert_type IN ('weather', 'travel_advisory', 'cancellation', 'health_advisory', 'local_disruption')
  ),
  severity text NOT NULL CHECK (severity IN ('green', 'yellow', 'red')),
  title text NOT NULL,
  summary text NOT NULL,
  details text NOT NULL,
  advice text[] NOT NULL CHECK (cardinality(advice) > 0),
  alternatives text[] NOT NULL DEFAULT '{}',
  affected_regions text[] NOT NULL CHECK (cardinality(affected_regions) > 0),
  affected_area_description text NOT NULL,
  affected_area geography(MultiPolygon, 4326),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  source_provider text NOT NULL,
  source_name text NOT NULL,
  source_url text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safety_alerts_time_window_check CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX safety_alerts_active_time_idx
  ON safety_alerts (starts_at DESC, ends_at);

CREATE INDEX safety_alerts_regions_gin
  ON safety_alerts USING gin (affected_regions);

CREATE INDEX safety_alerts_severity_type_idx
  ON safety_alerts (severity, alert_type);

CREATE INDEX safety_alerts_affected_area_gix
  ON safety_alerts USING gist (affected_area);
