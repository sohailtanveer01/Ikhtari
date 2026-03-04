-- Track when the acceptor reviewed and approved the initiator's answers
ALTER TABLE matches ADD COLUMN IF NOT EXISTS gate_approved_at TIMESTAMPTZ;
