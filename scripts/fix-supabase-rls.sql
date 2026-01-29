-- Disable RLS on foods table to allow public read access
ALTER TABLE foods DISABLE ROW LEVEL SECURITY;

-- Or alternatively, create a policy for public read access
-- Uncomment this if you want to use RLS policies instead

-- CREATE POLICY "Allow public read access" ON foods
-- FOR SELECT TO anon
-- USING (true);

-- CREATE POLICY "Allow authenticated users full access" ON foods
-- FOR ALL TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- Enable RLS if using policies
-- ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
