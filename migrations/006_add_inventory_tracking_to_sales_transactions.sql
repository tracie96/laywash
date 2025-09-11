-- Add inventory tracking fields to sales_transactions table
-- This migration adds fields to track which inventory item was sold in each transaction

ALTER TABLE sales_transactions 
ADD COLUMN inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
ADD COLUMN inventory_name TEXT,
ADD COLUMN quantity_sold DECIMAL(10,2);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_transactions_inventory_id ON sales_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_inventory_name ON sales_transactions(inventory_name);

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN sales_transactions.inventory_id IS 'Reference to the inventory item sold in this transaction';
COMMENT ON COLUMN sales_transactions.inventory_name IS 'Name of the inventory item at time of sale (snapshot for historical accuracy)';
COMMENT ON COLUMN sales_transactions.quantity_sold IS 'Quantity of inventory item sold in this transaction';
