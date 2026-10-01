ALTER TABLE itinerary_stops
  ADD COLUMN place_provider text CHECK (place_provider IN ('geoapify')),
  ADD COLUMN place_id text,
  ADD COLUMN place_name text,
  ADD COLUMN place_category text,
  ADD COLUMN place_address text,
  ADD COLUMN place_latitude double precision CHECK (place_latitude BETWEEN -90 AND 90),
  ADD COLUMN place_longitude double precision CHECK (place_longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT itinerary_stop_place_fields_check CHECK (
    (place_provider IS NULL AND place_id IS NULL AND place_name IS NULL AND
      place_category IS NULL AND place_address IS NULL AND place_latitude IS NULL AND
      place_longitude IS NULL)
    OR
    (place_provider IS NOT NULL AND place_id IS NOT NULL AND place_name IS NOT NULL AND
      place_category IS NOT NULL AND place_address IS NOT NULL AND place_latitude IS NOT NULL AND
      place_longitude IS NOT NULL)
  );

CREATE INDEX itinerary_stops_place_idx
  ON itinerary_stops (place_provider, place_id)
  WHERE place_id IS NOT NULL;
