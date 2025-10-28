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

    // Get all washer tools for this washer (both returned and unreturned)
    const { data: allTools, error: toolsError } = await supabaseAdmin
      .from('washer_tools')
      .select('*')
      .eq('is_returned', false)
      .eq('washer_id', washerId);

    if (toolsError) {
      console.error('Error fetching washer tools:', toolsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch washer tools' },
        { status: 500 }
      );
    }

    // Get used quantities from check_in_materials for all tools
    const toolIds = allTools?.map(tool => tool.id) || [];
    const usedQuantities: Record<string, number> = {};

    if (toolIds.length > 0) {
      const { data: usedMaterials, error: usedError } = await supabaseAdmin
        .from('check_in_materials')
        .select('material_id, quantity_used, washer_id')
        .in('material_id', toolIds);

      if (!usedError && usedMaterials) {
        // Calculate total used quantity for each tool by washer
        usedMaterials.forEach(used => {
          const key = `${used.material_id}_${used.washer_id}`;
          usedQuantities[key] = (usedQuantities[key] || 0) + used.quantity_used;
        });
      }
    }

    // Calculate deductions based on unreturned tools
    let materialDeductions = 0;
    let toolDeductions = 0;
    const unreturnedItems: Array<{
      id: string;
      toolName: string;
      toolType: string;
      quantity: number;
      amount: number;
      totalValue: number;
      assignedDate: string;
      notes?: string;
    }> = [];

    if (allTools && allTools.length > 0) {
      for (const tool of allTools) {
        // Get used quantity from check_in_materials
        const usedKey = `${tool.id}_${tool.washer_id}`;
        const usedQuantity = usedQuantities[usedKey] || 0;
        
        // Calculate unreturned quantity: assigned - used - returned
        const returnedQuantity = tool.returned_quantity || 0;
        const unreturnedQuantity = tool.quantity - usedQuantity - returnedQuantity;
        
        // Only include tools that have unreturned items
        if (unreturnedQuantity > 0) {
          const totalValue = (tool.amount || 0) * unreturnedQuantity;
          
          unreturnedItems.push({
            id: tool.id,
            toolName: tool.tool_name,
            toolType: tool.tool_type,
            quantity: unreturnedQuantity, // Show unreturned quantity instead of total quantity
            amount: tool.amount || 0,
            totalValue,
            assignedDate: tool.assigned_date,
            notes: tool.notes
          });

          // Categorize deductions based on tool type
          if (tool.tool_type === 'material' || tool.tool_type === 'supply') {
            materialDeductions += totalValue;
          } else {
            toolDeductions += totalValue;
          }
        }
      }
    }

    const totalDeductions = materialDeductions + toolDeductions;

    return NextResponse.json({
      success: true,
      deductions: {
        materialDeductions,
        toolDeductions,
        totalDeductions
      },
      unreturnedItems,
      hasUnreturnedTools: unreturnedItems.length > 0
    });

  } catch (error) {
    console.error('Calculate deductions error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
