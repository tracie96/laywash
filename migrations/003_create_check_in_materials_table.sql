-- Create check_in_materials table for tracking materials used in check-ins
-- This migration creates a table to track which materials washers use for specific check-ins

CREATE TABLE IF NOT EXISTS check_in_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_in_id UUID NOT NULL REFERENCES car_check_ins(id) ON DELETE CASCADE,
    washer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES washer_tools(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    quantity_used DECIMAL(10,2) NOT NULL CHECK (quantity_used > 0),
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    usage_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_check_in_materials_check_in_id ON check_in_materials(check_in_id);
CREATE INDEX IF NOT EXISTS idx_check_in_materials_washer_id ON check_in_materials(washer_id);
CREATE INDEX IF NOT EXISTS idx_check_in_materials_material_id ON check_in_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_check_in_materials_usage_date ON check_in_materials(usage_date);

-- Create unique constraint to prevent duplicate material assignments for the same check-in
CREATE UNIQUE INDEX IF NOT EXISTS idx_check_in_materials_unique 
ON check_in_materials(check_in_id, material_id);

-- Enable Row Level Security (RLS)
ALTER TABLE check_in_materials ENABLE ROW LEVEL SECURITY;

-- Create policy for washers to manage their own check-in materials
CREATE POLICY "Allow washers to manage their own check-in materials" ON check_in_materials
    FOR ALL USING (washer_id = auth.uid());

-- Create policy for admins to read all check-in materials
CREATE POLICY "Allow admins to read all check-in materials" ON check_in_materials
    FOR SELECT USING (auth.role() = 'admin' OR auth.role() = 'super_admin');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_check_in_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_check_in_materials_updated_at
    BEFORE UPDATE ON check_in_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_check_in_materials_updated_at();

-- Add comments to document the purpose of the table and columns
COMMENT ON TABLE check_in_materials IS 'Tracks materials used by washers for specific car wash check-ins';
COMMENT ON COLUMN check_in_materials.check_in_id IS 'Reference to the car check-in';
COMMENT ON COLUMN check_in_materials.washer_id IS 'Reference to the washer using the materials';
COMMENT ON COLUMN check_in_materials.material_id IS 'Reference to the washer tool/material';
COMMENT ON COLUMN check_in_materials.material_name IS 'Name of the material for display purposes';
COMMENT ON COLUMN check_in_materials.quantity_used IS 'Amount of material used for this check-in';
COMMENT ON COLUMN check_in_materials.amount IS 'Cost/amount associated with the material usage';
COMMENT ON COLUMN check_in_materials.usage_date IS 'Date and time when the material was used';
