-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address TEXT NOT NULL,
    lga TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on LGA for faster queries
CREATE INDEX IF NOT EXISTS idx_locations_lga ON locations(lga);

-- Create index on address for search functionality
CREATE INDEX IF NOT EXISTS idx_locations_address ON locations USING gin(to_tsvector('english', address));

-- Enable Row Level Security (RLS)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read locations
CREATE POLICY "Allow authenticated users to read locations" ON locations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy for admins to manage locations
CREATE POLICY "Allow admins to manage locations" ON locations
    FOR ALL USING (auth.role() = 'admin' OR auth.role() = 'super_admin');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
