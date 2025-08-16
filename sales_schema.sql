-- Sales and Inventory Management Schema
-- This file documents the database tables needed for the sales functionality

-- Sales Transactions Table
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

-- Sales Items Table
CREATE TABLE IF NOT EXISTS sales_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sales_transaction_id UUID REFERENCES sales_transactions(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES stock_items(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Movements Table (Audit Trail)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_item_id UUID REFERENCES stock_items(id) NOT NULL,
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_transactions_customer_id ON sales_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_admin_id ON sales_transactions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_created_at ON sales_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_items_transaction_id ON sales_items(sales_transaction_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_inventory_id ON sales_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_admin_id ON inventory_movements(admin_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);

-- Comments
COMMENT ON TABLE sales_transactions IS 'Records of all sales transactions';
COMMENT ON TABLE sales_items IS 'Individual items sold in each transaction';
COMMENT ON TABLE inventory_movements IS 'Audit trail of all inventory changes (in/out)';
COMMENT ON COLUMN sales_transactions.customer_id IS 'Optional customer ID for walk-in customers';
COMMENT ON COLUMN sales_transactions.admin_id IS 'Admin who processed the sale';
COMMENT ON COLUMN inventory_movements.reference_id IS 'ID of the related record (sale, restock, etc.)';
COMMENT ON COLUMN inventory_movements.reference_type IS 'Type of the related record (sales_transaction, restock, etc.)';

-- IMPORTANT: Make sure the stock_items table exists and has the correct structure
-- The stock_items table should have these columns:
-- id (UUID, PRIMARY KEY)
-- name (TEXT)
-- category (TEXT)
-- current_stock (INTEGER)
-- minimum_stock (INTEGER)
-- cost_per_unit (DECIMAL)
-- supplier (TEXT)
-- unit (TEXT)
-- is_active (BOOLEAN)
-- created_at (TIMESTAMP)
-- updated_at (TIMESTAMP)

-- If the stock_items table doesn't exist, create it:
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    cost_per_unit DECIMAL(10,2) DEFAULT 0.00,
    supplier TEXT DEFAULT 'Unknown',
    unit TEXT DEFAULT 'units',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for stock_items
CREATE INDEX IF NOT EXISTS idx_stock_items_name ON stock_items(name);
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON stock_items(category);
CREATE INDEX IF NOT EXISTS idx_stock_items_is_active ON stock_items(is_active);
