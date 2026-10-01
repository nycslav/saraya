ALTER TABLE generation_top_up_transactions
  ADD COLUMN credits_remaining integer,
  ADD COLUMN refunded_at timestamptz,
  ADD COLUMN refund_event_id text,
  ADD COLUMN credits_reversed integer NOT NULL DEFAULT 0;

WITH balances AS (
  SELECT
    top_up.transaction_id,
    LEAST(
      top_up.credits_granted,
      GREATEST(
        0,
        COALESCE(account.top_up_balance, 0) - COALESCE(
          SUM(top_up.credits_granted) OVER (
            PARTITION BY top_up.user_id
            ORDER BY top_up.purchased_at DESC NULLS FIRST,
              top_up.created_at DESC,
              top_up.transaction_id DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ),
          0
        )
      )
    )::integer AS credits_remaining
  FROM generation_top_up_transactions AS top_up
  LEFT JOIN generation_quota_accounts AS account ON account.user_id = top_up.user_id
)
UPDATE generation_top_up_transactions AS top_up
SET credits_remaining = balances.credits_remaining
FROM balances
WHERE top_up.transaction_id = balances.transaction_id;

ALTER TABLE generation_top_up_transactions
  ALTER COLUMN credits_remaining SET NOT NULL,
  ADD CONSTRAINT generation_top_up_credits_remaining_check
    CHECK (credits_remaining >= 0 AND credits_remaining <= credits_granted),
  ADD CONSTRAINT generation_top_up_credits_reversed_check
    CHECK (credits_reversed >= 0 AND credits_reversed <= credits_granted);

CREATE UNIQUE INDEX generation_top_up_transactions_refund_event_idx
  ON generation_top_up_transactions (refund_event_id)
  WHERE refund_event_id IS NOT NULL;
