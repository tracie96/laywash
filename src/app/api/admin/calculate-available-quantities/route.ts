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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const washerId = searchParams.get('washerId');

    if (!washerId) {
      return NextResponse.json(
        { success: false, error: 'washerId is required' },
        { status: 400 }
      );
    }

    // Get all washer tools for the specific washer
    const { data: washerTools, error: toolsError } = await supabaseAdmin
      .from('washer_tools')
      .select('id, tool_name, quantity, tool_type, amount')
      .eq('washer_id', washerId)
      .eq('is_returned', false); // Only non-returned tools

    if (toolsError) {
      console.error('Error fetching washer tools:', toolsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch washer tools' },
        { status: 500 }
      );
    }

    // Get all used quantities from check_in_materials for this washer
    const { data: usedMaterials, error: usedError } = await supabaseAdmin
      .from('check_in_materials')
      .select('material_name, quantity_used')
      .eq('washer_id', washerId);

    if (usedError) {
      console.error('Error fetching used materials:', usedError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch used materials' },
        { status: 500 }
      );
    }

    // Calculate available quantities
    const availableQuantities = washerTools?.map(tool => {
      // Sum up all used quantities for this specific tool
      const totalUsed = usedMaterials
        ?.filter(used => used.material_name === tool.tool_name)
        .reduce((sum, used) => sum + used.quantity_used, 0) || 0;

      // Calculate available quantity: assigned quantity - used quantity
      const availableQuantity = Math.max(0, tool.quantity - totalUsed);

      return {
        id: tool.id,
        toolName: tool.tool_name,
        toolType: tool.tool_type,
        assignedQuantity: tool.quantity,
        usedQuantity: totalUsed,
        availableQuantity: availableQuantity,
        amount: tool.amount
      };
    }) || [];

    return NextResponse.json({
      success: true,
      availableQuantities,
      message: 'Available quantities calculated successfully'
    });

  } catch (error) {
    console.error('Calculate available quantities error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
