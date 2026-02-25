CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  location GEOGRAPHY(POINT, 4326),
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  ticket_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  ticket_currency TEXT DEFAULT 'USD',
  max_capacity INTEGER,
  tickets_sold INTEGER DEFAULT 0,
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  organizer_name TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX events_location_idx ON events USING GIST (location);
CREATE INDEX events_date_idx ON events (event_date);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_public_read" ON events FOR SELECT USING (is_active = true);
