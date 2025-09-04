-- Add amount field to payment_request table
-- This migration adds a field to store the actual withdrawal amount requested by the washer

ALTER TABLE payment_request 
ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add comment to document the purpose of this field
COMMENT ON COLUMN payment_request.amount IS 'The actual amount requested for withdrawal by the washer';

-- Update existing records to set amount based on current calculation
-- (total_earnings - material_deductions - tool_deductions)
UPDATE payment_request 
SET amount = COALESCE(total_earnings, 0) - COALESCE(material_deductions, 0) - COALESCE(tool_deductions, 0)
WHERE amount = 0;

-- Add index for better query performance
CREATE INDEX idx_payment_request_amount ON payment_request(amount);



