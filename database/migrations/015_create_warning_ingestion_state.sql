CREATE TABLE warning_ingestion_state (
  provider text PRIMARY KEY,
  last_checked_at timestamptz NOT NULL,
  last_succeeded_at timestamptz,
  last_error_code text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX safety_alerts_source_active_idx
  ON safety_alerts (source_provider, ends_at);
