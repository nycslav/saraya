CREATE TABLE check_ins (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  destination_id text NOT NULL REFERENCES destinations(id) ON DELETE RESTRICT,
  visited_at timestamptz NOT NULL,
  journal_entry text NOT NULL DEFAULT '' CHECK (char_length(journal_entry) <= 2000),
  mood text CHECK (mood IN ('calm', 'happy', 'brave', 'amazed', 'reflective')),
  companions text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX check_ins_user_visited_idx ON check_ins (user_id, visited_at DESC);
CREATE INDEX check_ins_user_destination_idx ON check_ins (user_id, destination_id);
