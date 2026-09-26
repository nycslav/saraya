-- Consolidated schema snapshot. Apply changes through ordered migrations.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE destinations (
  id text PRIMARY KEY,
  name text NOT NULL,
  province text NOT NULL,
  region text NOT NULL,
  island_group text NOT NULL CHECK (island_group IN ('Luzon', 'Visayas', 'Mindanao')),
  category text NOT NULL CHECK (category IN ('Beach', 'Culture', 'Food', 'Heritage', 'Mountain', 'Nature')),
  rating numeric(2, 1) NOT NULL CHECK (rating BETWEEN 0 AND 5),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  summary text NOT NULL,
  description text NOT NULL,
  hero_tone text NOT NULL CHECK (hero_tone IN ('sky', 'sunset', 'forest', 'lagoon', 'violet', 'gold')),
  tags text[] NOT NULL CHECK (cardinality(tags) > 0),
  highlights text[] NOT NULL CHECK (cardinality(highlights) > 0),
  best_for text[] NOT NULL CHECK (cardinality(best_for) > 0),
  thumbnail_image_url text,
  photos text[] NOT NULL DEFAULT '{}',
  is_hidden_gem boolean NOT NULL DEFAULT false,
  location geography(Point, 4326) NOT NULL,
  historical_context text NOT NULL,
  etiquette text[] NOT NULL CHECK (cardinality(etiquette) > 0),
  local_phrase text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX destinations_location_gix ON destinations USING gist (location);
CREATE INDEX destinations_region_idx ON destinations (region);
CREATE INDEX destinations_island_group_idx ON destinations (island_group);
CREATE INDEX destinations_tags_gin ON destinations USING gin (tags);

CREATE TABLE itineraries (
  id text PRIMARY KEY,
  destination_id text NOT NULL REFERENCES destinations(id),
  user_id text,
  generation_source text NOT NULL DEFAULT 'deterministic'
    CHECK (generation_source IN ('gemini', 'openai', 'deterministic')),
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
  place_provider text CHECK (place_provider IN ('geoapify')),
  place_id text,
  place_name text,
  place_category text,
  place_address text,
  place_latitude double precision CHECK (place_latitude BETWEEN -90 AND 90),
  place_longitude double precision CHECK (place_longitude BETWEEN -180 AND 180),
  CONSTRAINT itinerary_stop_place_fields_check CHECK (
    (place_provider IS NULL AND place_id IS NULL AND place_name IS NULL AND
      place_category IS NULL AND place_address IS NULL AND place_latitude IS NULL AND
      place_longitude IS NULL)
    OR
    (place_provider IS NOT NULL AND place_id IS NOT NULL AND place_name IS NOT NULL AND
      place_category IS NOT NULL AND place_address IS NOT NULL AND place_latitude IS NOT NULL AND
      place_longitude IS NOT NULL)
  ),
  PRIMARY KEY (itinerary_id, id),
  FOREIGN KEY (itinerary_id, day_number)
    REFERENCES itinerary_days(itinerary_id, day_number)
    ON DELETE CASCADE
);

CREATE INDEX itineraries_destination_idx ON itineraries (destination_id);
CREATE INDEX itineraries_user_idx ON itineraries (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX itinerary_stops_place_idx
  ON itinerary_stops (place_provider, place_id)
  WHERE place_id IS NOT NULL;

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

CREATE INDEX bucket_list_items_user_added_idx ON bucket_list_items (user_id, added_at DESC);

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

CREATE TABLE achievements (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL CHECK (category IN ('exploration', 'food', 'culture', 'nature')),
  rule_type text NOT NULL CHECK (rule_type IN ('total_visits', 'destination_category', 'island_group', 'distinct_island_groups')),
  threshold integer NOT NULL CHECK (threshold > 0),
  destination_category text,
  island_group text CHECK (island_group IN ('Luzon', 'Visayas', 'Mindanao')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT achievements_rule_parameters_check CHECK (
    (rule_type = 'destination_category' AND destination_category IS NOT NULL AND island_group IS NULL)
    OR (rule_type = 'island_group' AND island_group IS NOT NULL AND destination_category IS NULL)
    OR (rule_type IN ('total_visits', 'distinct_island_groups') AND destination_category IS NULL AND island_group IS NULL)
  )
);

CREATE TABLE user_achievements (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  achievement_id text NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  check_in_id text REFERENCES check_ins(id) ON DELETE SET NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_achievements_user_badge_unique UNIQUE (user_id, achievement_id)
);

CREATE INDEX user_achievements_user_unlocked_idx ON user_achievements (user_id, unlocked_at DESC);

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

CREATE INDEX safety_alerts_active_time_idx ON safety_alerts (starts_at DESC, ends_at);
CREATE INDEX safety_alerts_regions_gin ON safety_alerts USING gin (affected_regions);
CREATE INDEX safety_alerts_severity_type_idx ON safety_alerts (severity, alert_type);
CREATE INDEX safety_alerts_affected_area_gix ON safety_alerts USING gist (affected_area);

CREATE TABLE device_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  push_token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
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

CREATE TABLE festival_reminders (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  lead_days smallint NOT NULL CHECK (lead_days IN (1, 7)),
  remind_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'dispatching', 'sent', 'skipped', 'cancelled')
  ),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT festival_reminders_sent_state_check CHECK (
    (status = 'sent' AND sent_at IS NOT NULL)
    OR (status <> 'sent' AND sent_at IS NULL)
  )
);

CREATE UNIQUE INDEX festival_reminders_active_user_festival_unique
  ON festival_reminders (user_id, festival_id)
  WHERE status = 'active';

CREATE INDEX festival_reminders_user_status_idx
  ON festival_reminders (user_id, status, remind_at);

CREATE INDEX festival_reminders_due_idx
  ON festival_reminders (remind_at, id)
  WHERE status = 'active';
