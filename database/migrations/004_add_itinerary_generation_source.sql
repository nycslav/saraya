ALTER TABLE itineraries
  ADD COLUMN generation_source text NOT NULL DEFAULT 'deterministic'
  CHECK (generation_source IN ('gemini', 'openai', 'deterministic'));
