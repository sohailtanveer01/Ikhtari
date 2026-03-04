-- Seed intent questions for all fake/seed profiles
-- Only inserts if the user exists and has no questions yet
-- Uses ON CONFLICT DO NOTHING to be idempotent

-- ============================================================
-- V3 FEMALE PROFILES  (bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01 to bb10)
-- ============================================================

-- Fatima Al-Hassan (London, Arab, Very Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'What role does daily prayer play in your life, and how would you envision that in a shared home?', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'Are you open to living near both families, or do you prefer building a home independently?', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'How important is it to you that your future spouse is involved in your cultural traditions?', 2)
ON CONFLICT DO NOTHING;

-- Aisha Rahman (Birmingham, South Asian, Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'How do you see the balance between career ambitions and family life after marriage?', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'What does a peaceful home environment look like to you on a typical evening?', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'How soon after marriage would you want to start a family?', 2)
ON CONFLICT DO NOTHING;

-- Mariam Ali (Dubai, Arab/East African, Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'Would you be comfortable relocating after marriage, and what factors would influence that decision?', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'How do you handle disagreements — do you prefer to resolve things immediately or give each other space first?', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'What are your expectations around a wife continuing her career post-marriage?', 2)
ON CONFLICT DO NOTHING;

-- Sara Hassan (Houston, South Asian, Moderately Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'How do you picture a typical weekend together as a married couple?', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'What are your thoughts on joint vs. separate finances in a marriage?', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'How involved do you expect in-laws to be in day-to-day married life?', 2)
ON CONFLICT DO NOTHING;

-- Nadia Malik (Toronto, South Asian, Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'What is your approach to raising children with strong Islamic values in a Western environment?', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'How important is physical fitness and a healthy lifestyle to you in a partner?', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'Describe what emotional support looks like to you in a marriage.', 2)
ON CONFLICT DO NOTHING;

-- Zainab Ibrahim (New York, Arab/African, Very Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06', 'What does Islamic marriage mean to you beyond a legal contract?', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06', 'How do you feel about a wife maintaining close friendships outside of the marriage?', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06', 'What is something non-negotiable for you in a marriage partner?', 2)
ON CONFLICT DO NOTHING;

-- Amira Tehrani (Amsterdam, Persian, Moderately Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb07', 'How do you feel about merging two different cultural backgrounds in a marriage?', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb07', 'What level of religious observance are you hoping for in a partner?', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb07', 'How do you ensure you keep growing together rather than apart over time?', 2)
ON CONFLICT DO NOTHING;

-- Layla Yilmaz (Paris, Turkish, Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb08', 'What are your expectations around travel and exploring the world together after marriage?', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb08', 'How do you define a fair division of household responsibilities?', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb08', 'What would make you feel truly seen and appreciated by a spouse?', 2)
ON CONFLICT DO NOTHING;

-- Hana Qureshi (Melbourne, South Asian, Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb09', 'How important is it that your spouse shares your hobbies and interests?', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb09', 'What is your view on a wife being the primary earner at some point in a marriage?', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb09', 'How do you approach giving and receiving constructive feedback in a relationship?', 2)
ON CONFLICT DO NOTHING;

-- Rania Abdullah (Manchester, Arab, Very Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb10', 'How do you balance your personal ambitions with the needs of a family?', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb10', 'What does quality time mean to you in a marriage — how often and what form?', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb10', 'What is your perspective on the mahr, and what does it represent to you?', 2)
ON CONFLICT DO NOTHING;

-- ============================================================
-- V3 MALE PROFILES  (cccccccc-cccc-cccc-cccc-cccccccccc01 to cc10)
-- ============================================================

-- Omar Hassan (London, Arab, Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', 'What does leading a household with kindness (Qawwam) mean to you in practice?', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', 'How do you envision the role of your wife''s family in your marriage?', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', 'What habits or routines would you want to build together from day one?', 2)
ON CONFLICT DO NOTHING;

-- Yusuf Ibrahim (Birmingham, West African, Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc02', 'How do you handle financial stress as a couple — do you discuss openly or manage separately?', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccc02', 'How important is it for you that your spouse is close with your family?', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccc02', 'What is your vision for how Islam shapes the atmosphere of your home?', 2)
ON CONFLICT DO NOTHING;

-- Ahmed Al-Rashid (Dubai, Arab, Very Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc03', 'What are your expectations around the wife''s role once children arrive?', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccc03', 'How do you prefer to resolve conflict — through calm discussion, a break, or mediation?', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccc03', 'What does a spiritually fulfilling marriage look like to you?', 2)
ON CONFLICT DO NOTHING;

-- Bilal Malik (Chicago, South Asian, Moderately Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc04', 'How do you picture your life in 5 years, and where does marriage fit into that?', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccc04', 'Are you comfortable with your spouse having a demanding career and often long hours?', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccc04', 'What is one thing you will never compromise on in a marriage?', 2)
ON CONFLICT DO NOTHING;

-- Tariq Hussain (Manchester, South Asian, Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc05', 'How involved do you want to be in raising your children on a day-to-day basis?', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccc05', 'What is your approach to spending quality time together when life gets busy?', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccc05', 'How do you feel about your spouse maintaining friendships with the opposite gender?', 2)
ON CONFLICT DO NOTHING;

-- Imran Khan (London, South Asian, Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc06', 'What role does honesty play in a marriage, even when the truth is uncomfortable?', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccc06', 'How do you plan to keep the romance and connection alive after years of marriage?', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccc06', 'What are your thoughts on living with or near parents after marriage?', 2)
ON CONFLICT DO NOTHING;

-- Khalid Al-Farsi (Abu Dhabi, Arab, Very Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc07', 'How do you balance tradition and modernity in how you want to run your household?', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccc07', 'What is your view on a wife continuing her education or professional goals after marriage?', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccc07', 'What would you do to ensure your spouse feels secure and cherished every day?', 2)
ON CONFLICT DO NOTHING;

-- Zaid Rahman (Sydney, South Asian, Moderately Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc08', 'How do you approach big life decisions — together, or does one person take the lead?', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccc08', 'What is your expectation around Islamic education for your children?', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccc08', 'How comfortable are you with your spouse spending time with her friends independently?', 2)
ON CONFLICT DO NOTHING;

-- Faisal Qureshi (Houston, South Asian, Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc09', 'What does emotional intelligence mean to you, and how do you practise it?', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccc09', 'How would you support your spouse through a difficult period in their life?', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccc09', 'What are your thoughts on the number of children and spacing between them?', 2)
ON CONFLICT DO NOTHING;

-- Hassan Abdullah (Washington DC, Arab, Very Practicing)
INSERT INTO intent_questions (user_id, question_text, display_order) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc10', 'How do you see the concept of shura (mutual consultation) working in your marriage?', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccc10', 'What would your ideal Friday evening look like as a family?', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccc10', 'How important is financial transparency between spouses to you?', 2)
ON CONFLICT DO NOTHING;

-- Update intent_questions_set flag for all v3 seed profiles
UPDATE users SET intent_questions_set = true
WHERE id IN (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb07',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb08',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb09',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb10',
  'cccccccc-cccc-cccc-cccc-cccccccccc01',
  'cccccccc-cccc-cccc-cccc-cccccccccc02',
  'cccccccc-cccc-cccc-cccc-cccccccccc03',
  'cccccccc-cccc-cccc-cccc-cccccccccc04',
  'cccccccc-cccc-cccc-cccc-cccccccccc05',
  'cccccccc-cccc-cccc-cccc-cccccccccc06',
  'cccccccc-cccc-cccc-cccc-cccccccccc07',
  'cccccccc-cccc-cccc-cccc-cccccccccc08',
  'cccccccc-cccc-cccc-cccc-cccccccccc09',
  'cccccccc-cccc-cccc-cccc-cccccccccc10'
);
