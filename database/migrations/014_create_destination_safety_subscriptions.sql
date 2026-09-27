CREATE TABLE destination_safety_subscriptions (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_id text NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, destination_id)
);

CREATE INDEX destination_safety_subscriptions_destination_idx
  ON destination_safety_subscriptions (destination_id, user_id);
