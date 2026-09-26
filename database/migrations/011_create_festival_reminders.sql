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
