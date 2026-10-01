CREATE TABLE itineraries (
  id text PRIMARY KEY,
  destination_id text NOT NULL REFERENCES destinations(id),
  user_id text,
  title text NOT NULL,
  subtitle text NOT NULL,
  preferences jsonb NOT NULL,
  generated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE itinerary_days (
  itinerary_id text NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  day_number integer NOT NULL CHECK (day_number > 0),
  title text NOT NULL,
  PRIMARY KEY (itinerary_id, day_number)
);

CREATE TABLE itinerary_stops (
  itinerary_id text NOT NULL,
  day_number integer NOT NULL,
  id text NOT NULL,
  time text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('transport', 'activity', 'meal', 'stay')),
  PRIMARY KEY (itinerary_id, id),
  FOREIGN KEY (itinerary_id, day_number)
    REFERENCES itinerary_days(itinerary_id, day_number)
    ON DELETE CASCADE
);

CREATE INDEX itineraries_destination_idx ON itineraries (destination_id);
CREATE INDEX itineraries_user_idx ON itineraries (user_id) WHERE user_id IS NOT NULL;
