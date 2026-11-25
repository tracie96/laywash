import { SupabaseClient } from '@supabase/supabase-js';

export type InventoryMovementType = 'initial' | 'stock_in' | 'stock_out' | 'sale' | 'bonus';

interface InventoryMovement {
  inventoryItemId: string;
  movementType: InventoryMovementType;
  previousBalance: number;
  newBalance: number;
  adminId: string | null;
  reason: string;
  referenceId?: string;
  referenceType?: string;
}

/**
 * Logs a stock change to inventory_movements. Never throws: a failed log must not
 * undo or block the stock change it describes.
 */
export async function recordInventoryMovement(supabase: SupabaseClient, movement: InventoryMovement) {
  const quantity = Math.round(Math.abs(movement.newBalance - movement.previousBalance));
  // admin_id is required by the table; skip rather than fail when the caller is unknown
  if (quantity === 0 || !movement.adminId) return;

  const { error } = await supabase.from('inventory_movements').insert({
    inventory_item_id: movement.inventoryItemId,
    movement_type: movement.movementType,
    quantity,
    previous_balance: Math.round(movement.previousBalance),
    new_balance: Math.round(movement.newBalance),
    reason: movement.reason,
    admin_id: movement.adminId,
    reference_id: movement.referenceId || null,
    reference_type: movement.referenceType || null
  });

  if (error) {
    console.error('Error recording inventory movement:', error);
  }
}
