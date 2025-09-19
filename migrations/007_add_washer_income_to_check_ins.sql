-- Add washer_income column to car_check_ins table
-- This migration adds a column to track the income earned by washers for each check-in

-- Add washer_income column to car_check_ins table
ALTER TABLE car_check_ins 
ADD COLUMN IF NOT EXISTS washer_income DECIMAL(10,2) DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN car_check_ins.washer_income IS 'Amount earned by the assigned washer for this check-in based on commission percentage';

-- Create index for better query performance when filtering by washer income
CREATE INDEX IF NOT EXISTS idx_car_check_ins_washer_income ON car_check_ins(washer_income);

-- Update existing records to calculate washer income based on services
-- This is a one-time update for existing data
UPDATE car_check_ins 
SET washer_income = COALESCE(
  (
    SELECT SUM(
      (cis.price * s.washer_commission_percentage) / 100
    )
    FROM check_in_services cis
    JOIN services s ON cis.service_id = s.id
    WHERE cis.check_in_id = car_check_ins.id
    AND s.washer_commission_percentage IS NOT NULL
  ), 0
)
WHERE washer_income = 0 AND status IN ('completed', 'paid');
