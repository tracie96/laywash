
-- The original constraint only allowed 'in' / 'out', so every movement logged by
-- src/lib/inventoryMovements.ts was rejected
ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_movement_type_check
  CHECK (movement_type IN ('in', 'out', 'initial', 'stock_in', 'stock_out', 'sale', 'bonus'));
