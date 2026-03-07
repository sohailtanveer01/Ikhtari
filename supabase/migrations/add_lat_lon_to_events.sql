-- Add lat/lon generated columns to events table
-- These are computed from the PostGIS geography column so that
-- SELECT * returns lat/lon automatically for map rendering in the app.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS lat FLOAT GENERATED ALWAYS AS (ST_Y(location::geometry)) STORED,
  ADD COLUMN IF NOT EXISTS lon FLOAT GENERATED ALWAYS AS (ST_X(location::geometry)) STORED;
