CREATE TABLE device_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_tokens_push_token_unique UNIQUE (push_token)
);

CREATE INDEX device_tokens_user_idx ON device_tokens (user_id);
CREATE INDEX device_tokens_active_user_idx ON device_tokens (user_id) WHERE is_active;

CREATE TABLE notification_preferences (
  user_id text PRIMARY KEY,
  safety_alerts_enabled boolean NOT NULL DEFAULT false,
  festival_reminders_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
