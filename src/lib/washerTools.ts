import { SupabaseClient } from '@supabase/supabase-js';
import { selectAll } from './supabaseQuery';

export interface WasherToolRow {
  id: string;
  washer_id: string;
  tool_name: string;
  tool_type: string;
  quantity: number;
  returned_quantity?: number | null;
  charged_quantity?: number | null;
  amount?: number | null;
  assigned_date: string;
  returned_date?: string | null;
  is_returned: boolean;
  notes?: string | null;
}

export interface OutstandingItem {
  id: string;
  toolName: string;
  toolType: string;
  quantity: number;
  amount: number;
  totalValue: number;
  assignedDate: string;
  notes?: string | null;
}

// Long .in() lists overflow the request URL (Bad Request); above this, fetch everything and filter in memory
const MAX_IN_IDS = 100;

/**
 * Sums quantity_used per washer_tools row from check_in_materials, counting only
 * check-ins whose status is in `statuses` (default: completed jobs).
 * Usage is only counted when the check-in's washer matches the tool's washer.
 */
export async function getUsedQuantities(
  supabase: SupabaseClient,
  tools: Pick<WasherToolRow, 'id' | 'washer_id'>[],
  statuses: string[] = ['completed']
): Promise<Record<string, number>> {
  const used: Record<string, number> = {};
  if (tools.length === 0) return used;

  const toolWasher = new Map(tools.map(t => [String(t.id), String(t.washer_id)]));
  const toolIds = Array.from(toolWasher.keys());

  let materials: { material_id: string; quantity_used: number; washer_id: string }[];
  try {
    // Filter by check-in status in the database via an inner join
    materials = await selectAll(() => {
      const query = supabase
        .from('check_in_materials')
        .select('material_id, quantity_used, washer_id, check_in:car_check_ins!inner(status)')
        .in('check_in.status', statuses)
        .order('id');
      return toolIds.length <= MAX_IN_IDS ? query.in('material_id', toolIds) : query;
    });
  } catch (error) {
    console.error('Error fetching tool usage:', error);
    return used;
  }

  for (const m of materials) {
    const toolId = String(m.material_id);
    if (toolWasher.get(toolId) !== String(m.washer_id)) continue;
    used[toolId] = (used[toolId] || 0) + (m.quantity_used || 0);
  }

  return used;
}

/** Quantity still with the washer: assigned - used - returned - already charged. */
export function getOutstandingQuantity(tool: WasherToolRow, usedQuantity: number): number {
  return Math.max(
    0,
    tool.quantity - usedQuantity - (tool.returned_quantity || 0) - (tool.charged_quantity || 0)
  );
}

/** A tool becomes chargeable once its expected return date (stored in returned_date) has passed. */
export function isReturnDue(expectedReturnDate: string | null | undefined): boolean {
  if (!expectedReturnDate) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const returnDate = new Date(expectedReturnDate);
  returnDate.setHours(0, 0, 0, 0);

  return returnDate <= today;
}

/** Unreturned, overdue tools for a washer and the amount to deduct from their balance. */
export async function getOutstandingCharges(supabase: SupabaseClient, washerId: string) {
  const { data: tools, error } = await supabase
    .from('washer_tools')
    .select('*')
    .eq('is_returned', false)
    .eq('washer_id', washerId);

  if (error) throw error;

  const usedQuantities = await getUsedQuantities(supabase, tools || []);

  let materialDeductions = 0;
  let toolDeductions = 0;
  const unreturnedItems: OutstandingItem[] = [];

  for (const tool of (tools || []) as WasherToolRow[]) {
    const outstanding = getOutstandingQuantity(tool, usedQuantities[tool.id] || 0);
    if (outstanding <= 0 || !isReturnDue(tool.returned_date)) continue;

    const totalValue = (tool.amount || 0) * outstanding;
    unreturnedItems.push({
      id: tool.id,
      toolName: tool.tool_name,
      toolType: tool.tool_type,
      quantity: outstanding,
      amount: tool.amount || 0,
      totalValue,
      assignedDate: tool.assigned_date,
      notes: tool.notes
    });

    if (tool.tool_type === 'material' || tool.tool_type === 'supply') {
      materialDeductions += totalValue;
    } else {
      toolDeductions += totalValue;
    }
  }

  return {
    deductions: {
      materialDeductions,
      toolDeductions,
      totalDeductions: materialDeductions + toolDeductions
    },
    unreturnedItems,
    tools: (tools || []) as WasherToolRow[]
  };
}

/**
 * Records that the given outstanding items were deducted from the washer, so they
 * are not charged again. Tools with nothing left outstanding are closed.
 */
export async function markToolsCharged(
  supabase: SupabaseClient,
  tools: WasherToolRow[],
  items: OutstandingItem[]
) {
  const usedQuantities = await getUsedQuantities(supabase, tools);

  for (const item of items) {
    const tool = tools.find(t => t.id === item.id);
    if (!tool) continue;

    const chargedQuantity = (tool.charged_quantity || 0) + item.quantity;
    const fullyAccounted =
      getOutstandingQuantity({ ...tool, charged_quantity: chargedQuantity }, usedQuantities[tool.id] || 0) === 0;

    const { error } = await supabase
      .from('washer_tools')
      .update({
        charged_quantity: chargedQuantity,
        is_returned: fullyAccounted,
        updated_at: new Date().toISOString()
      })
      .eq('id', tool.id);

    if (error) {
      console.error(`Error marking washer tool ${tool.id} as charged:`, error);
    }
  }
}
