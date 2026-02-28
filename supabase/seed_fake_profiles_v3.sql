-- ============================================================
-- Seed data v3 — only columns saved by current onboarding (done.tsx)
-- Removed: sect, born_muslim, religious_practice, alcohol_habit,
--           smoking_habit, hobbies, bio, religion, intent
-- Run in Supabase SQL Editor (runs as service role by default)
-- ============================================================

-- Disable the email-sync trigger (no real auth.users backing these rows)
ALTER TABLE public.users DISABLE TRIGGER on_public_user_created;

-- Remove old seed data if re-running
DELETE FROM public.user_prompts WHERE user_id::text LIKE 'bbbbbbbb%' OR user_id::text LIKE 'cccccccc%';
DELETE FROM public.users WHERE email LIKE '%@testuser.com';

INSERT INTO public.users (
  id, email, first_name, last_name, name,
  gender, dob, height,
  marital_status, has_children,
  ethnicity, nationality,
  education, profession,
  photos, city, country, location,
  account_active, intent_questions_set,
  blur_photos, is_premium, boost_count,
  created_at, updated_at, last_active_at
) VALUES

-- ============================================================
-- FEMALE PROFILES
-- ============================================================

-- Female 1: Fatima — Arab, London UK
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
  'fatima.alhassan@testuser.com',
  'Fatima', 'Al-Hassan', 'Fatima Al-Hassan',
  'female', '1996-03-15', '5''4"',
  'single', false,
  'Arab', 'Saudi Arabia',
  'Bachelor''s in Business Administration', 'Accountant',
  ARRAY[
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800'
  ],
  'London', 'United Kingdom',
  ST_GeogFromText('SRID=4326;POINT(-0.1276 51.5074)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour'
),

-- Female 2: Aisha — South Asian, Birmingham UK
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
  'aisha.rahman@testuser.com',
  'Aisha', 'Rahman', 'Aisha Rahman',
  'female', '1998-07-22', '5''2"',
  'single', false,
  'South Asian', 'Pakistan',
  'Master''s in Computer Science', 'Software Developer',
  ARRAY[
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800'
  ],
  'Birmingham', 'United Kingdom',
  ST_GeogFromText('SRID=4326;POINT(-1.8904 52.4862)'),
  true, true,
  false, true, 1,
  NOW() - INTERVAL '25 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 hours'
),

-- Female 3: Mariam — Arab, Dubai UAE
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03',
  'mariam.ali@testuser.com',
  'Mariam', 'Ali', 'Mariam Ali',
  'female', '1994-11-08', '5''5"',
  'divorced', false,
  'Arab', 'Egypt',
  'Bachelor''s in Architecture', 'Architect',
  ARRAY[
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800',
    'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?w=800'
  ],
  'Dubai', 'United Arab Emirates',
  ST_GeogFromText('SRID=4326;POINT(55.2708 25.2048)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '20 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '30 minutes'
),

-- Female 4: Sara — Horn of Africa, Houston USA
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04',
  'sara.hassan@testuser.com',
  'Sara', 'Hassan', 'Sara Hassan',
  'female', '1997-05-30', '5''3"',
  'single', false,
  'Horn of Africa', 'Somalia',
  'Bachelor''s in Nursing', 'Nurse',
  ARRAY[
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800'
  ],
  'Houston', 'United States',
  ST_GeogFromText('SRID=4326;POINT(-95.3698 29.7604)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 hours'
),

-- Female 5: Nadia — Punjabi, Toronto Canada
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05',
  'nadia.malik@testuser.com',
  'Nadia', 'Malik', 'Nadia Malik',
  'female', '1995-09-14', '5''6"',
  'single', false,
  'Punjabi', 'Pakistan',
  'Doctor of Medicine', 'Doctor',
  ARRAY[
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'
  ],
  'Toronto', 'Canada',
  ST_GeogFromText('SRID=4326;POINT(-79.3832 43.6532)'),
  true, true,
  false, true, 1,
  NOW() - INTERVAL '10 days', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '20 minutes'
),

-- Female 6: Zainab — Arab, New York USA
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06',
  'zainab.ibrahim@testuser.com',
  'Zainab', 'Ibrahim', 'Zainab Ibrahim',
  'female', '1999-02-18', '5''1"',
  'single', false,
  'Arab', 'Jordan',
  'Bachelor''s in Journalism', 'Journalist',
  ARRAY[
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800'
  ],
  'New York', 'United States',
  ST_GeogFromText('SRID=4326;POINT(-74.0060 40.7128)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '8 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 hours'
),

-- Female 7: Amira — Persian, Amsterdam Netherlands
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb07',
  'amira.tehrani@testuser.com',
  'Amira', 'Tehrani', 'Amira Tehrani',
  'female', '1993-06-25', '5''7"',
  'divorced', false,
  'Persian', 'Iran',
  'Master''s in Business Administration', 'Entrepreneur',
  ARRAY[
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800',
    'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?w=800',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800'
  ],
  'Amsterdam', 'Netherlands',
  ST_GeogFromText('SRID=4326;POINT(4.9041 52.3676)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '12 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'
),

-- Female 8: Layla — Turkic, Paris France
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb08',
  'layla.yilmaz@testuser.com',
  'Layla', 'Yilmaz', 'Layla Yilmaz',
  'female', '1996-12-10', '5''4"',
  'single', false,
  'Turkic', 'Turkey',
  'Bachelor''s in Design', 'Designer',
  ARRAY[
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800'
  ],
  'Paris', 'France',
  ST_GeogFromText('SRID=4326;POINT(2.3522 48.8566)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 hours'
),

-- Female 9: Hana — South Asian, Melbourne Australia
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb09',
  'hana.qureshi@testuser.com',
  'Hana', 'Qureshi', 'Hana Qureshi',
  'female', '1998-04-05', '5''5"',
  'single', false,
  'South Asian', 'Pakistan',
  'Bachelor''s in Pharmacy', 'Pharmacist',
  ARRAY[
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800'
  ],
  'Melbourne', 'Australia',
  ST_GeogFromText('SRID=4326;POINT(144.9631 -37.8136)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '18 days', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '10 minutes'
),

-- Female 10: Rania — Arab, Manchester UK
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb10',
  'rania.abdullah@testuser.com',
  'Rania', 'Abdullah', 'Rania Abdullah',
  'female', '1997-08-20', '5''3"',
  'single', false,
  'Arab', 'Morocco',
  'Bachelor''s in Education', 'Teacher',
  ARRAY[
    'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?w=800',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800'
  ],
  'Manchester', 'United Kingdom',
  ST_GeogFromText('SRID=4326;POINT(-2.2426 53.4808)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '7 days', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '45 minutes'
),

-- ============================================================
-- MALE PROFILES
-- ============================================================

-- Male 1: Omar — Arab, London UK
(
  'cccccccc-cccc-cccc-cccc-cccccccccc01',
  'omar.hassan@testuser.com',
  'Omar', 'Hassan', 'Omar Hassan',
  'male', '1993-04-12', '5''10"',
  'single', false,
  'Arab', 'Morocco',
  'Master''s in Finance', 'Financial Advisor',
  ARRAY[
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800'
  ],
  'London', 'United Kingdom',
  ST_GeogFromText('SRID=4326;POINT(-0.1276 51.5074)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '28 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 hours'
),

-- Male 2: Yusuf — South Asian, Birmingham UK
(
  'cccccccc-cccc-cccc-cccc-cccccccccc02',
  'yusuf.ibrahim@testuser.com',
  'Yusuf', 'Ibrahim', 'Yusuf Ibrahim',
  'male', '1994-09-28', '5''11"',
  'single', false,
  'South Asian', 'Pakistan',
  'Doctor of Medicine', 'Doctor',
  ARRAY[
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800'
  ],
  'Birmingham', 'United Kingdom',
  ST_GeogFromText('SRID=4326;POINT(-1.8904 52.4862)'),
  true, true,
  false, true, 1,
  NOW() - INTERVAL '22 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 minutes'
),

-- Male 3: Ahmed — Arab, Dubai UAE
(
  'cccccccc-cccc-cccc-cccc-cccccccccc03',
  'ahmed.rashid@testuser.com',
  'Ahmed', 'Al-Rashid', 'Ahmed Al-Rashid',
  'male', '1991-07-15', '6''0"',
  'single', false,
  'Arab', 'Saudi Arabia',
  'Master''s in Engineering', 'Engineer',
  ARRAY[
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
  ],
  'Dubai', 'United Arab Emirates',
  ST_GeogFromText('SRID=4326;POINT(55.2708 25.2048)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '14 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 hour'
),

-- Male 4: Bilal — South Asian, Chicago USA
(
  'cccccccc-cccc-cccc-cccc-cccccccccc04',
  'bilal.malik@testuser.com',
  'Bilal', 'Malik', 'Bilal Malik',
  'male', '1995-11-03', '5''9"',
  'single', false,
  'South Asian', 'Pakistan',
  'Bachelor''s in Computer Science', 'Software Developer',
  ARRAY[
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800'
  ],
  'Chicago', 'United States',
  ST_GeogFromText('SRID=4326;POINT(-87.6298 41.8781)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '11 days', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '15 minutes'
),

-- Male 5: Tariq — Bengali, Manchester UK
(
  'cccccccc-cccc-cccc-cccc-cccccccccc05',
  'tariq.hussain@testuser.com',
  'Tariq', 'Hussain', 'Tariq Hussain',
  'male', '1992-01-20', '5''8"',
  'divorced', false,
  'Bengali', 'Bangladesh',
  'Bachelor''s in Law', 'Lawyer',
  ARRAY[
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
  ],
  'Manchester', 'United Kingdom',
  ST_GeogFromText('SRID=4326;POINT(-2.2426 53.4808)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '9 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 hours'
),

-- Male 6: Imran — Pashtun, London UK
(
  'cccccccc-cccc-cccc-cccc-cccccccccc06',
  'imran.khan@testuser.com',
  'Imran', 'Khan', 'Imran Khan',
  'male', '1996-06-17', '5''11"',
  'single', false,
  'Pashtun', 'Pakistan',
  'MBA', 'Entrepreneur',
  ARRAY[
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800'
  ],
  'London', 'United Kingdom',
  ST_GeogFromText('SRID=4326;POINT(-0.1276 51.5074)'),
  true, true,
  false, true, 1,
  NOW() - INTERVAL '6 days', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '1 hour'
),

-- Male 7: Khalid — Arab, Abu Dhabi UAE
(
  'cccccccc-cccc-cccc-cccc-cccccccccc07',
  'khalid.alfarsi@testuser.com',
  'Khalid', 'Al-Farsi', 'Khalid Al-Farsi',
  'male', '1990-03-08', '6''1"',
  'single', false,
  'Arab', 'United Arab Emirates',
  'Bachelor''s in Business Administration', 'Project Manager',
  ARRAY[
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800'
  ],
  'Abu Dhabi', 'United Arab Emirates',
  ST_GeogFromText('SRID=4326;POINT(54.3773 24.4539)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 hours'
),

-- Male 8: Zaid — South Asian, Sydney Australia
(
  'cccccccc-cccc-cccc-cccc-cccccccccc08',
  'zaid.rahman@testuser.com',
  'Zaid', 'Rahman', 'Zaid Rahman',
  'male', '1994-10-22', '5''9"',
  'single', false,
  'South Asian', 'Pakistan',
  'Bachelor''s in Accounting', 'Accountant',
  ARRAY[
    'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
  ],
  'Sydney', 'Australia',
  ST_GeogFromText('SRID=4326;POINT(151.2093 -33.8688)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '16 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 hours'
),

-- Male 9: Faisal — Punjabi, Houston USA
(
  'cccccccc-cccc-cccc-cccc-cccccccccc09',
  'faisal.qureshi@testuser.com',
  'Faisal', 'Qureshi', 'Faisal Qureshi',
  'male', '1993-12-14', '5''10"',
  'single', false,
  'Punjabi', 'Pakistan',
  'Doctor of Pharmacy', 'Pharmacist',
  ARRAY[
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
  ],
  'Houston', 'United States',
  ST_GeogFromText('SRID=4326;POINT(-95.3698 29.7604)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '21 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 hours'
),

-- Male 10: Hassan — Arab, Washington DC USA
(
  'cccccccc-cccc-cccc-cccc-cccccccccc10',
  'hassan.abdullah@testuser.com',
  'Hassan', 'Abdullah', 'Hassan Abdullah',
  'male', '1991-05-30', '6''0"',
  'single', false,
  'Arab', 'Jordan',
  'Master''s in Public Policy', 'Consultant',
  ARRAY[
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800'
  ],
  'Washington DC', 'United States',
  ST_GeogFromText('SRID=4326;POINT(-77.0369 38.9072)'),
  true, true,
  false, false, 1,
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '20 minutes'
);

-- ============================================================
-- Re-enable the trigger
-- ============================================================
ALTER TABLE public.users ENABLE TRIGGER on_public_user_created;

-- ============================================================
-- Seed user_prompts (2 per profile)
-- ============================================================
INSERT INTO public.user_prompts (user_id, question, answer, display_order) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'My ideal weekend looks like', 'A morning with Quran, brunch with family, and an evening walk somewhere scenic.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'The way to my heart is', 'Kindness to others, especially to those who can do nothing for you.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'I get overly excited about', 'New tech releases and a perfectly optimised piece of code.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'My love language is', 'Acts of service and quality time — I show I care by doing.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'A non-negotiable for me is', 'Honesty. I would rather a hard truth than a comfortable lie.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'I am inspired by', 'People who rebuild after hardship with grace and gratitude.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'My family would describe me as', 'The one who feeds everyone and then worries about whether they liked it.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'Something I value deeply', 'Community. We are not meant to do life alone.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'My ideal partner is', 'Someone who takes their salah seriously and still makes me laugh.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'Green flag for me is', 'A man who is kind to his mother and patient with strangers.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06', 'I will know it is the right person when', 'Being together feels like peace, not performance.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06', 'My biggest personality trait', 'I ask too many questions — occupational hazard.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb07', 'I am looking for someone who', 'Has a vision for his life and the integrity to live by it.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb07', 'What I bring to a relationship', 'Loyalty, stability, and an extremely good taste in food.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb08', 'The best way to get to know me', 'Come to a museum with me and just watch what I get excited about.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb08', 'I find beauty in', 'Good design, honest conversations, and the adhan at Fajr.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb09', 'My love language is', 'Feeding people — if I cooked for you, I probably really like you.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb09', 'Something my friends say about me', 'That I am the most reliable person they know.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb10', 'I spend my free time', 'Reading, cooking something new, or calling my mum.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb10', 'My definition of a good marriage', 'Two people choosing each other every day, grounded in taqwa.', 2),
('cccccccc-cccc-cccc-cccc-cccccccccc01', 'I am known for', 'Always being the one with a plan — and a backup plan.', 1),
('cccccccc-cccc-cccc-cccc-cccccccccc01', 'My ideal Sunday', 'Fajr, gym, a big breakfast, and nowhere to be until Dhuhr.', 2),
('cccccccc-cccc-cccc-cccc-cccccccccc02', 'What I am looking for', 'A woman of substance — in her deen, her character, and her ambitions.', 1),
('cccccccc-cccc-cccc-cccc-cccccccccc02', 'My green flag', 'I still open doors and pull out chairs. Old-fashioned that way.', 2),
('cccccccc-cccc-cccc-cccc-cccccccccc03', 'My life motto', 'Build well, plan thoroughly, trust Allah completely.', 1),
('cccccccc-cccc-cccc-cccc-cccccccccc03', 'I want a partner who', 'Will pray with me and also go on adventures with me.', 2),
('cccccccc-cccc-cccc-cccc-cccccccccc04', 'I relax by', 'Long drives, good podcasts, and a strong cup of chai.', 1),
('cccccccc-cccc-cccc-cccc-cccccccccc04', 'A conversation starter for me', 'What is something you are genuinely working on improving about yourself?', 2),
('cccccccc-cccc-cccc-cccc-cccccccccc05', 'I am looking for', 'Depth, not just compatibility. Someone I can have real conversations with.', 1),
('cccccccc-cccc-cccc-cccc-cccccccccc05', 'What I have learned', 'That patience is not passive — it is choosing to keep going with trust in Allah.', 2),
('cccccccc-cccc-cccc-cccc-cccccccccc06', 'The first thing you will notice about me', 'I am direct and I mean what I say.', 1),
('cccccccc-cccc-cccc-cccc-cccccccccc06', 'My biggest ambition', 'To build a home filled with laughter and open doors for guests.', 2),
('cccccccc-cccc-cccc-cccc-cccccccccc07', 'I believe in', 'Simplicity. The things that matter most are rarely complicated.', 1),
('cccccccc-cccc-cccc-cccc-cccccccccc07', 'My family would say', 'That I am the most stubborn but also the most dependable person they know.', 2),
('cccccccc-cccc-cccc-cccc-cccccccccc08', 'My perfect day', 'Sunrise walk, decent coffee, solid work, good food, Isha in congregation.', 1),
('cccccccc-cccc-cccc-cccc-cccccccccc08', 'I am at my best when', 'The people around me are happy and well-fed.', 2),
('cccccccc-cccc-cccc-cccc-cccccccccc09', 'Ask me about', 'The best biryani I have ever made. I am very proud of it.', 1),
('cccccccc-cccc-cccc-cccc-cccccccccc09', 'I take seriously', 'My five daily prayers and my monthly calls with my parents.', 2),
('cccccccc-cccc-cccc-cccc-cccccccccc10', 'I talk too much about', 'History — I genuinely believe you cannot understand today without knowing yesterday.', 1),
('cccccccc-cccc-cccc-cccc-cccccccccc10', 'I am looking for', 'A partner who is my friend first, spouse second, and co-parent third.', 2);

-- ============================================================
-- Verification
-- ============================================================
SELECT gender, COUNT(*) FROM public.users WHERE email LIKE '%@testuser.com' GROUP BY gender;
