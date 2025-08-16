-- Complete Database Schema for Car Wash Management System
-- Run this SQL script in your Supabase SQL Editor to create all missing tables

-- ==============================================
-- 1. PAYMENT REQUESTS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS carwasher_payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  washer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_amount DECIMAL(10,2) NOT NULL,
  request_type VARCHAR(50) NOT NULL DEFAULT 'salary' CHECK (request_type IN ('salary', 'bonus', 'overtime', 'advance')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  requested_for_period_start DATE,
  requested_for_period_end DATE,
  description TEXT,
  notes TEXT,
  
  -- Admin fields
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  approved_amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  paid_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 2. INVENTORY TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 0,
    cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    supplier TEXT,
    unit TEXT NOT NULL DEFAULT 'pieces',
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    sku VARCHAR(100),
    last_restock_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 3. STOCK ITEMS TABLE (Alternative name for inventory)
-- ==============================================
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 0,
    cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    supplier TEXT,
    unit TEXT NOT NULL DEFAULT 'pieces',
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    sku VARCHAR(100),
    last_restock_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 4. INVENTORY MOVEMENTS TABLE (Audit Trail)
-- ==============================================
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_item_id UUID REFERENCES inventory(id) NOT NULL,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('in', 'out')),
    quantity INTEGER NOT NULL,
    previous_balance INTEGER NOT NULL,
    new_balance INTEGER NOT NULL,
    reason TEXT NOT NULL,
    admin_id UUID REFERENCES users(id) NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 5. SALES TRANSACTIONS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS sales_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id),
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    admin_id UUID REFERENCES users(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 6. SALES ITEMS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS sales_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sales_transaction_id UUID REFERENCES sales_transactions(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES stock_items(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 7. BONUSES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS bonuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('customer', 'washer')),
    recipient_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    milestone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Payment Requests Indexes
CREATE INDEX IF NOT EXISTS idx_carwasher_payment_requests_washer_id ON carwasher_payment_requests(washer_id);
CREATE INDEX IF NOT EXISTS idx_carwasher_payment_requests_status ON carwasher_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_carwasher_payment_requests_request_date ON carwasher_payment_requests(request_date);

-- Inventory Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_is_active ON inventory(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_current_stock ON inventory(current_stock);
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON stock_items(category);
CREATE INDEX IF NOT EXISTS idx_stock_items_is_active ON stock_items(is_active);

-- Inventory Movements Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_admin_id ON inventory_movements(admin_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);

-- Sales Indexes
CREATE INDEX IF NOT EXISTS idx_sales_transactions_customer_id ON sales_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_admin_id ON sales_transactions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_created_at ON sales_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_items_transaction_id ON sales_items(sales_transaction_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_inventory_id ON sales_items(inventory_item_id);

-- Bonuses Indexes
CREATE INDEX IF NOT EXISTS idx_bonuses_type ON bonuses(type);
CREATE INDEX IF NOT EXISTS idx_bonuses_status ON bonuses(status);
CREATE INDEX IF NOT EXISTS idx_bonuses_recipient_id ON bonuses(recipient_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_created_at ON bonuses(created_at);

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE carwasher_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonuses ENABLE ROW LEVEL SECURITY;

-- Payment Requests Policies
CREATE POLICY "Car washers can manage their own payment requests" ON carwasher_payment_requests
  FOR ALL
  USING (
    auth.uid() = washer_id
    OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Inventory Policies (Admin only)
CREATE POLICY "Admins can manage inventory" ON inventory
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage stock items" ON stock_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can view inventory movements" ON inventory_movements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Sales Policies (Admin only)
CREATE POLICY "Admins can manage sales" ON sales_transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage sales items" ON sales_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Bonuses Policies
CREATE POLICY "Super admins can read all bonuses" ON bonuses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage bonuses" ON bonuses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ==============================================
-- TRIGGERS FOR UPDATED_AT FIELDS
-- ==============================================

-- Create or update the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_carwasher_payment_requests_updated_at 
    BEFORE UPDATE ON carwasher_payment_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON inventory 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at 
    BEFORE UPDATE ON stock_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_transactions_updated_at 
    BEFORE UPDATE ON sales_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bonuses_updated_at 
    BEFORE UPDATE ON bonuses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- SAMPLE DATA (OPTIONAL)
-- ==============================================

-- Insert some sample inventory items
INSERT INTO inventory (name, category, current_stock, minimum_stock, cost_per_unit, supplier, unit) VALUES
('Car Shampoo', 'cleaning', 50, 10, 15.99, 'CleanCorp', 'bottles'),
('Microfiber Towels', 'cleaning', 100, 20, 2.50, 'TextilePro', 'pieces'),
('Tire Shine Spray', 'detailing', 30, 5, 8.99, 'ShineBright', 'bottles'),
('Glass Cleaner', 'cleaning', 25, 5, 6.50, 'ClearView', 'bottles'),
('Vacuum Bags', 'equipment', 200, 50, 0.75, 'VacuumSupply', 'pieces')
ON CONFLICT DO NOTHING;

-- Copy to stock_items table as well
INSERT INTO stock_items (name, category, current_stock, minimum_stock, cost_per_unit, supplier, unit) VALUES
('Car Shampoo', 'cleaning', 50, 10, 15.99, 'CleanCorp', 'bottles'),
('Microfiber Towels', 'cleaning', 100, 20, 2.50, 'TextilePro', 'pieces'),
('Tire Shine Spray', 'detailing', 30, 5, 8.99, 'ShineBright', 'bottles'),
('Glass Cleaner', 'cleaning', 25, 5, 6.50, 'ClearView', 'bottles'),
('Vacuum Bags', 'equipment', 200, 50, 0.75, 'VacuumSupply', 'pieces')
ON CONFLICT DO NOTHING;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================
-- All tables created successfully!
-- You can now use all the API endpoints that depend on these tables.
