CREATE TABLE users (
  id text PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  google_subject text UNIQUE,
  home_region text,
  travel_style text,
  budget text,
  interests text[] NOT NULL DEFAULT '{}',
  preferred_regions text[] NOT NULL DEFAULT '{}',
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email));

CREATE TABLE refresh_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_active_user_idx
  ON refresh_tokens (user_id, expires_at)
  WHERE revoked_at IS NULL;
