-- Add returned_quantity field to washer_tools table
-- This field will track how many items have been returned for each tool assignment

-- Add the returned_quantity column with a default value of 0
ALTER TABLE washer_tools 
ADD COLUMN IF NOT EXISTS returned_quantity INTEGER DEFAULT 0;

-- Add a check constraint to ensure returned_quantity is not negative
ALTER TABLE washer_tools 
ADD CONSTRAINT check_returned_quantity_non_negative 
CHECK (returned_quantity >= 0);

-- Add a check constraint to ensure returned_quantity doesn't exceed quantity
ALTER TABLE washer_tools 
ADD CONSTRAINT check_returned_quantity_not_exceed_quantity 
CHECK (returned_quantity <= quantity);

-- Update existing records to set returned_quantity based on is_returned status
-- If is_returned is true, set returned_quantity to quantity
-- If is_returned is false, set returned_quantity to 0
UPDATE washer_tools 
SET returned_quantity = CASE 
    WHEN is_returned = true THEN quantity 
    ELSE 0 
END;

-- Add a comment to document the field
COMMENT ON COLUMN washer_tools.returned_quantity IS 'Number of items returned out of the total quantity assigned';
