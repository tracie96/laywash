
ALTER TABLE washer_tools
  ADD COLUMN IF NOT EXISTS charged_quantity integer NOT NULL DEFAULT 0;
