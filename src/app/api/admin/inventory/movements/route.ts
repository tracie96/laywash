import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Movement types that add stock
const ADDITION_TYPES = ['initial', 'stock_in'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction') || 'all'; // 'in' | 'all'
    const itemId = searchParams.get('itemId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 1000);

    let query = supabaseAdmin
      .from('inventory_movements')
      .select(`
        id,
        inventory_item_id,
        movement_type,
        quantity,
        previous_balance,
        new_balance,
        reason,
        reference_id,
        reference_type,
        created_at,
        item:inventory!inventory_item_id (
          name,
          unit
        ),
        admin:users!admin_id (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (direction === 'in') {
      query = query.in('movement_type', ADDITION_TYPES);
    }

    if (itemId) {
      query = query.eq('inventory_item_id', itemId);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(`${startDate}T00:00:00`).toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', new Date(`${endDate}T23:59:59.999`).toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching inventory movements:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch stock movements' },
        { status: 500 }
      );
    }

    const movements = (data || []).map(movement => {
      const item = movement.item as unknown as { name?: string; unit?: string } | null;
      const admin = movement.admin as unknown as { name?: string } | null;

      return {
        id: movement.id,
        itemId: movement.inventory_item_id,
        itemName: item?.name || 'Deleted item',
        unit: item?.unit || '',
        type: movement.movement_type,
        isAddition: ADDITION_TYPES.includes(movement.movement_type),
        quantity: movement.quantity,
        previousBalance: movement.previous_balance,
        newBalance: movement.new_balance,
        reason: movement.reason,
        referenceId: movement.reference_id,
        referenceType: movement.reference_type,
        adminName: admin?.name || 'Unknown',
        createdAt: movement.created_at
      };
    });

    return NextResponse.json({
      success: true,
      movements
    });

  } catch (error) {
    console.error('Fetch inventory movements error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
