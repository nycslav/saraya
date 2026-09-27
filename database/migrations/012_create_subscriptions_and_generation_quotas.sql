CREATE TABLE revenuecat_customers (
  revenuecat_customer_id text PRIMARY KEY,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX revenuecat_customers_user_idx ON revenuecat_customers (user_id);

CREATE TABLE subscription_entitlements (
  user_id text NOT NULL,
  entitlement_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  product_id text,
  original_transaction_id text,
  expires_at timestamptz,
  source_event_id text,
  last_event_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entitlement_id)
);

CREATE TABLE revenuecat_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  app_user_id text,
  aliases text[] NOT NULL DEFAULT '{}',
  transferred_from text[] NOT NULL DEFAULT '{}',
  transferred_to text[] NOT NULL DEFAULT '{}',
  product_id text,
  entitlement_ids text[] NOT NULL DEFAULT '{}',
  transaction_id text,
  original_transaction_id text,
  environment text,
  event_at timestamptz NOT NULL,
  expiration_at timestamptz,
  status text NOT NULL CHECK (
    status IN ('pending_association', 'processed', 'ignored')
  ),
  user_id text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX revenuecat_webhook_events_customer_idx
  ON revenuecat_webhook_events (app_user_id, status);

CREATE TABLE generation_quota_accounts (
  user_id text PRIMARY KEY,
  free_used integer NOT NULL DEFAULT 0 CHECK (free_used >= 0),
  premium_period_start date,
  premium_used integer NOT NULL DEFAULT 0 CHECK (premium_used >= 0),
  top_up_balance integer NOT NULL DEFAULT 0 CHECK (top_up_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE generation_top_up_transactions (
  transaction_id text PRIMARY KEY,
  user_id text NOT NULL,
  product_id text NOT NULL,
  credits_granted integer NOT NULL CHECK (credits_granted > 0),
  source_event_id text,
  purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX generation_top_up_transactions_user_idx
  ON generation_top_up_transactions (user_id);

CREATE TABLE generation_quota_reservations (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('included', 'top-up')),
  access text NOT NULL CHECK (access IN ('free', 'premium')),
  period_start date,
  status text NOT NULL CHECK (status IN ('reserved', 'consumed', 'released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  released_at timestamptz
);

CREATE INDEX generation_quota_reservations_user_status_idx
  ON generation_quota_reservations (user_id, status);
