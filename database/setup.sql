-- GPS Tracker Database Setup
-- Run this SQL in your Supabase SQL Editor

-- 1. Create vehicle_locations table (main tracking table)
CREATE TABLE IF NOT EXISTS vehicle_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  speed NUMERIC NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicle_id ON vehicle_locations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_recorded_at ON vehicle_locations(recorded_at);
CREATE INDEX IF NOT EXISTS idx_vehicle_recorded ON vehicle_locations(vehicle_id, recorded_at DESC);

-- 3. Enable Real-Time (optional - for live updates)
ALTER TABLE vehicle_locations REPLICA IDENTITY FULL;

-- 4. Enable Row Level Security (RLS) - for production
ALTER TABLE vehicle_locations ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policy allowing anonymous inserts (for development)
-- WARNING: In production, use proper authentication
CREATE POLICY "Allow anonymous inserts" ON vehicle_locations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 6. Create RLS policy allowing reads (optional)
CREATE POLICY "Allow anonymous reads" ON vehicle_locations
  FOR SELECT
  TO anon
  USING (true);

-- 7. Grant permissions
GRANT INSERT ON vehicle_locations TO anon;
GRANT SELECT ON vehicle_locations TO anon;

-- 8. View last 100 locations for a vehicle
-- SELECT * FROM vehicle_locations 
-- WHERE vehicle_id = 'your-vehicle-id' 
-- ORDER BY recorded_at DESC 
-- LIMIT 100;

-- 9. Get current speed statistics
-- SELECT 
--   vehicle_id,
--   AVG(speed) as avg_speed,
--   MAX(speed) as max_speed,
--   MIN(speed) as min_speed,
--   COUNT(*) as total_records
-- FROM vehicle_locations
-- GROUP BY vehicle_id;
