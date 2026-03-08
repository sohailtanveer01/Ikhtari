-- Track when the initiator submitted their intent answers.
-- Lets the acceptor's client detect pending reviews via the matches table
-- without needing direct SELECT access to match_intent_answers.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS answers_submitted_at TIMESTAMPTZ;
