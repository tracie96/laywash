-- Washer Tools and Materials Management Schema

-- 1. Tools table (equipment assigned to washers)
CREATE TABLE IF NOT EXISTS washer_tools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    washer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    tool_type VARCHAR(50) NOT NULL, -- 'equipment', 'protective_gear', 'cleaning_tool'
    quantity INTEGER NOT NULL DEFAULT 1,
    assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    returned_date TIMESTAMP WITH TIME ZONE,
    is_returned BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Materials inventory table
CREATE TABLE IF NOT EXISTS washer_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    washer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    material_name VARCHAR(100) NOT NULL,
    material_type VARCHAR(50) NOT NULL, -- 'soap', 'chemical', 'wax', 'polish'
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- 'liters', 'bottles', 'pieces'
    assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    returned_quantity DECIMAL(10,2) DEFAULT 0,
    is_returned BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Check-in materials usage table
CREATE TABLE IF NOT EXISTS check_in_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_in_id UUID REFERENCES car_check_ins(id) ON DELETE CASCADE,
    washer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    material_id UUID REFERENCES washer_materials(id) ON DELETE CASCADE,
    material_name VARCHAR(100) NOT NULL,
    quantity_used DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    usage_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Daily material returns table
CREATE TABLE IF NOT EXISTS daily_material_returns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    washer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    return_date DATE NOT NULL,
    total_items_returned INTEGER DEFAULT 0,
    total_materials_returned INTEGER DEFAULT 0,
    deductions_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'completed'
    admin_notes TEXT,
    washer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Material return items table
CREATE TABLE IF NOT EXISTS material_return_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    return_id UUID REFERENCES daily_material_returns(id) ON DELETE CASCADE,
    material_id UUID REFERENCES washer_materials(id) ON DELETE CASCADE,
    material_name VARCHAR(100) NOT NULL,
    assigned_quantity DECIMAL(10,2) NOT NULL,
    returned_quantity DECIMAL(10,2) NOT NULL,
    used_quantity DECIMAL(10,2) NOT NULL,
    deduction_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tool return items table
CREATE TABLE IF NOT EXISTS tool_return_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    return_id UUID REFERENCES daily_material_returns(id) ON DELETE CASCADE,
    tool_id UUID REFERENCES washer_tools(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    assigned_quantity INTEGER NOT NULL,
    returned_quantity INTEGER NOT NULL,
    missing_quantity INTEGER NOT NULL,
    deduction_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Payment approval table
CREATE TABLE IF NOT EXISTS payment_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    washer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    approval_date DATE NOT NULL,
    total_earnings DECIMAL(10,2) NOT NULL,
    material_deductions DECIMAL(10,2) DEFAULT 0,
    tool_deductions DECIMAL(10,2) DEFAULT 0,
    net_payment DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'paid'
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_washer_tools_washer_id ON washer_tools(washer_id);
CREATE INDEX IF NOT EXISTS idx_washer_materials_washer_id ON washer_materials(washer_id);
CREATE INDEX IF NOT EXISTS idx_check_in_materials_check_in_id ON check_in_materials(check_in_id);
CREATE INDEX IF NOT EXISTS idx_check_in_materials_washer_id ON check_in_materials(washer_id);
CREATE INDEX IF NOT EXISTS idx_daily_material_returns_washer_id ON daily_material_returns(washer_id);
CREATE INDEX IF NOT EXISTS idx_daily_material_returns_date ON daily_material_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_payment_approvals_washer_id ON payment_approvals(washer_id);
CREATE INDEX IF NOT EXISTS idx_payment_approvals_date ON payment_approvals(approval_date);

-- RLS Policies
ALTER TABLE washer_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE washer_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_material_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_approvals ENABLE ROW LEVEL SECURITY;

-- Admin can view all records
CREATE POLICY "Admins can view all washer tools" ON washer_tools
    FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "Admins can view all washer materials" ON washer_materials
    FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "Admins can view all check-in materials" ON check_in_materials
    FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "Admins can view all daily returns" ON daily_material_returns
    FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "Admins can view all payment approvals" ON payment_approvals
    FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- Washers can view their own records
CREATE POLICY "Washers can view own tools" ON washer_tools
    FOR SELECT USING (auth.uid() = washer_id);

CREATE POLICY "Washers can view own materials" ON washer_materials
    FOR SELECT USING (auth.uid() = washer_id);

CREATE POLICY "Washers can view own check-in materials" ON check_in_materials
    FOR SELECT USING (auth.uid() = washer_id);

CREATE POLICY "Washers can view own returns" ON daily_material_returns
    FOR SELECT USING (auth.uid() = washer_id);

CREATE POLICY "Washers can view own payment approvals" ON payment_approvals
    FOR SELECT USING (auth.uid() = washer_id);

-- Admin can insert/update/delete
CREATE POLICY "Admins can manage washer tools" ON washer_tools
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "Admins can manage washer materials" ON washer_materials
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "Admins can manage check-in materials" ON check_in_materials
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "Admins can manage daily returns" ON daily_material_returns
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "Admins can manage payment approvals" ON payment_approvals
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_washer_tools_updated_at BEFORE UPDATE ON washer_tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_washer_materials_updated_at BEFORE UPDATE ON washer_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_material_returns_updated_at BEFORE UPDATE ON daily_material_returns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_approvals_updated_at BEFORE UPDATE ON payment_approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


