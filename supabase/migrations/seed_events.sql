-- Seed data for events table
-- Run: supabase db execute --file supabase/migrations/seed_events.sql

-- Clear existing seed data to prevent duplicates on re-run
DELETE FROM events;

INSERT INTO events (title, description, location_name, address, city, country, location, event_date, end_date, ticket_price, ticket_currency, max_capacity, cover_image_url, organizer_name, tags, is_active)
VALUES

-- Toronto
(
  'Muslim Singles Gala — Toronto',
  'Elegant black-tie optional evening for practicing Muslim professionals aged 27–42. Curated table settings, live nasheeds, and structured introductions by our matchmaking team. Family members welcome as chaperones.',
  'Arcadian Court',
  '401 Bay Street, Toronto, ON M5H 2Y4',
  'Toronto',
  'Canada',
  ST_GeogFromText('SRID=4326;POINT(-79.3831 43.6510)'),
  '2026-04-11 19:00:00-05',
  '2026-04-11 23:00:00-05',
  0.00,
  'CAD',
  80,
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80',
  'Ikhtiar Events Canada',
  ARRAY['gala','matrimonial','toronto','black-tie','free'],
  true
),

-- Birmingham UK
(
  'Know Before You Marry — Birmingham',
  'Free community seminar covering the rights and responsibilities of spouses in Islam, how to evaluate compatibility, the role of the wali, and practical advice for families. Sheikh-led Q&A session included.',
  'Birmingham Central Mosque',
  '180 Belgrave Middleway, Birmingham B12 0XS',
  'Birmingham',
  'United Kingdom',
  ST_GeogFromText('SRID=4326;POINT(-1.8986 52.4654)'),
  '2026-04-18 14:00:00+01',
  '2026-04-18 17:30:00+01',
  0.00,
  'GBP',
  200,
  'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=800&q=80',
  'Birmingham Central Mosque',
  ARRAY['free','seminar','islamic','birmingham','family'],
  true
),

-- Dubai
(
  'Gulf Muslim Matrimonial Forum — Dubai',
  'Premium matchmaking forum for Gulf-region Muslims. Two sessions: morning for sisters (wali required), afternoon for brothers. Professional matchmakers on hand. Formal attire required.',
  'Atlantis The Palm',
  'Crescent Road, Palm Jumeirah, Dubai',
  'Dubai',
  'United Arab Emirates',
  ST_GeogFromText('SRID=4326;POINT(55.1172 25.1302)'),
  '2026-04-25 10:00:00+04',
  '2026-04-25 18:00:00+04',
  0.00,
  'USD',
  150,
  'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
  'Ikhtiar Events Gulf',
  ARRAY['free','matrimonial','dubai','gulf','wali-required'],
  true
),

-- Manchester
(
  'Muslim Marriage Fair — Manchester',
  'The North''s biggest Muslim marriage fair returns. 20+ matchmaking stalls, live talks on Islamic marriage, legal advice for nikah, and a dedicated sisters-only area. Free entry.',
  'Manchester Central Convention Complex',
  'Windmill Street, Manchester M2 3GX',
  'Manchester',
  'United Kingdom',
  ST_GeogFromText('SRID=4326;POINT(-2.2428 53.4775)'),
  '2026-05-02 10:00:00+01',
  '2026-05-02 18:00:00+01',
  0.00,
  'GBP',
  500,
  'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80',
  'Muslim Marriage Events UK',
  ARRAY['free','fair','manchester','family-friendly'],
  true
),

-- Chicago
(
  'Halal Date Night — Chicago',
  'A relaxed, supervised social for single Muslims in their 20s and 30s. Rotating dinner tables ensure you meet everyone. No awkward one-on-ones — just good food and natural conversation in a halal environment.',
  'Aba Restaurant',
  '302 N Green Street, Chicago, IL 60607',
  'Chicago',
  'United States',
  ST_GeogFromText('SRID=4326;POINT(-87.6482 41.8858)'),
  '2026-05-09 18:30:00-06',
  '2026-05-09 21:30:00-06',
  0.00,
  'USD',
  50,
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  'Ikhtiar Events',
  ARRAY['free','social','dinner','chicago','casual'],
  true
),

-- Sydney
(
  'Muslim Professionals Mixer — Sydney',
  'Evening networking for Muslim professionals looking to meet like-minded singles. Speed introductions followed by open mingling. Catered halal finger food and mocktails. Ages 25–45.',
  'Sydney Harbour Marriott',
  '30 Pitt Street, Sydney NSW 2000',
  'Sydney',
  'Australia',
  ST_GeogFromText('SRID=4326;POINT(151.2093 -33.8612)'),
  '2026-05-16 18:00:00+11',
  '2026-05-16 21:00:00+11',
  0.00,
  'AUD',
  70,
  'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80',
  'Ikhtiar Australia',
  ARRAY['free','networking','professionals','sydney','halal'],
  true
),

-- Kuala Lumpur
(
  'Ikhtiar Asia Matrimonial Weekend — KL',
  'Two-day matrimonial retreat combining personal development workshops in the morning with structured introductions in the afternoon. International attendees welcome. Accommodation packages available.',
  'The Majestic Hotel Kuala Lumpur',
  '5 Jalan Sultan Hishamuddin, Kuala Lumpur 50000',
  'Kuala Lumpur',
  'Malaysia',
  ST_GeogFromText('SRID=4326;POINT(101.6941 3.1436)'),
  '2026-06-06 09:00:00+08',
  '2026-06-07 17:00:00+08',
  0.00,
  'USD',
  120,
  'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80',
  'Ikhtiar Asia',
  ARRAY['free','retreat','matrimonial','kuala-lumpur','international'],
  true
);
