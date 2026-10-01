CREATE TABLE achievements (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL CHECK (category IN ('exploration', 'food', 'culture', 'nature')),
  rule_type text NOT NULL CHECK (
    rule_type IN ('total_visits', 'destination_category', 'island_group', 'distinct_island_groups')
  ),
  threshold integer NOT NULL CHECK (threshold > 0),
  destination_category text,
  island_group text CHECK (island_group IN ('Luzon', 'Visayas', 'Mindanao')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT achievements_rule_parameters_check CHECK (
    (rule_type = 'destination_category' AND destination_category IS NOT NULL AND island_group IS NULL)
    OR (rule_type = 'island_group' AND island_group IS NOT NULL AND destination_category IS NULL)
    OR (rule_type IN ('total_visits', 'distinct_island_groups') AND
        destination_category IS NULL AND island_group IS NULL)
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

CREATE INDEX user_achievements_user_unlocked_idx
  ON user_achievements (user_id, unlocked_at DESC);
