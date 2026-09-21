CREATE TABLE bucket_list_items (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  destination_id text NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  personal_notes text NOT NULL DEFAULT '' CHECK (char_length(personal_notes) <= 500),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'visited', 'skipped')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bucket_list_items_user_destination_unique UNIQUE (user_id, destination_id)
);

CREATE INDEX bucket_list_items_user_added_idx
  ON bucket_list_items (user_id, added_at DESC);

CREATE INDEX bucket_list_items_user_status_idx
  ON bucket_list_items (user_id, status);

CREATE INDEX bucket_list_items_user_priority_idx
  ON bucket_list_items (user_id, priority);
