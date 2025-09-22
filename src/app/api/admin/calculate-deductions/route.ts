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
        // Calculate unreturned quantity: quantity - returned_quantity (default to 0 if not set)
        const returnedQuantity = tool.returned_quantity || 0;
        const unreturnedQuantity = tool.quantity - returnedQuantity;
        
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
