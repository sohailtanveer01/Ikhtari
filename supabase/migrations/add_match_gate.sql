-- Add initiated_by to matches table to track who liked first
ALTER TABLE matches ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create match_intent_answers table to store answers to the gate questions
CREATE TABLE IF NOT EXISTS match_intent_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES intent_questions(id) ON DELETE CASCADE,
  answerer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, question_id, answerer_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS match_intent_answers_match_id_idx ON match_intent_answers(match_id);
CREATE INDEX IF NOT EXISTS match_intent_answers_answerer_id_idx ON match_intent_answers(answerer_id);

-- RLS: answerer can insert, both match parties can read
ALTER TABLE match_intent_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Answerer can insert their own answers" ON match_intent_answers;
CREATE POLICY "Answerer can insert their own answers"
  ON match_intent_answers FOR INSERT
  WITH CHECK (auth.uid() = answerer_id);

DROP POLICY IF EXISTS "Match participants can read answers" ON match_intent_answers;
CREATE POLICY "Match participants can read answers"
  ON match_intent_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND (m.user1 = auth.uid() OR m.user2 = auth.uid())
    )
  );
