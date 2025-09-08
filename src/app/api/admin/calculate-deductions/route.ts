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

    // Get all unreturned washer tools for this washer
    const { data: unreturnedTools, error: toolsError } = await supabaseAdmin
      .from('washer_tools')
      .select('*')
      .eq('washer_id', washerId)
      .eq('is_returned', false);

    if (toolsError) {
      console.error('Error fetching unreturned tools:', toolsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch unreturned tools' },
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

    if (unreturnedTools && unreturnedTools.length > 0) {
      for (const tool of unreturnedTools) {
        const totalValue = (tool.amount || 0) * (tool.quantity || 1);
        
        unreturnedItems.push({
          id: tool.id,
          toolName: tool.tool_name,
          toolType: tool.tool_type,
          quantity: tool.quantity,
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
