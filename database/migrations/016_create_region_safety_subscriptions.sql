CREATE TABLE region_safety_subscriptions (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, region)
);

CREATE INDEX region_safety_subscriptions_region_idx
  ON region_safety_subscriptions (region, user_id);
