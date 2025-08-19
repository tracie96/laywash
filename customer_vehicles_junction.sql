-- Customer Vehicles Junction Table
-- This table creates a many-to-many relationship between customers and vehicles

-- Create customer_vehicles junction table
CREATE TABLE IF NOT EXISTS customer_vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique customer-vehicle pairs
    UNIQUE(customer_id, vehicle_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_customer_id ON customer_vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_vehicle_id ON customer_vehicles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_is_primary ON customer_vehicles(is_primary);

-- Create unique constraint to ensure one primary vehicle per customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_vehicles_primary_per_customer 
ON customer_vehicles(customer_id) WHERE is_primary = true;

-- Enable Row Level Security
ALTER TABLE customer_vehicles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for authenticated users" ON customer_vehicles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON customer_vehicles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON customer_vehicles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON customer_vehicles
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_vehicles_updated_at
    BEFORE UPDATE ON customer_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_vehicles_updated_at();

-- Create trigger to ensure only one primary vehicle per customer
CREATE OR REPLACE FUNCTION ensure_single_primary_vehicle()
RETURNS TRIGGER AS $$
BEGIN
    -- If this vehicle is being set as primary, unset other primary vehicles for this customer
    IF NEW.is_primary = true THEN
        UPDATE customer_vehicles 
        SET is_primary = false 
        WHERE customer_id = NEW.customer_id 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_primary_vehicle
    BEFORE INSERT OR UPDATE ON customer_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_vehicle();
