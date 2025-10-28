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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { quantity } = await request.json();

    if (quantity === undefined || quantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a non-negative number' },
        { status: 400 }
      );
    }

    // Update the washer tool quantity
    const { data: updatedTool, error } = await supabaseAdmin
      .from('washer_tools')
      .update({ 
        quantity: quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        washer:users!washer_tools_washer_id_fkey (
          id,
          name,
          email,
          phone
        )
      `)
      .single();

    if (error) {
      console.error('Error updating washer tool quantity:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update washer tool quantity' },
        { status: 500 }
      );
    }

    // Transform the response
    const transformedTool = {
      id: updatedTool.id,
      washerId: updatedTool.washer_id,
      washer: updatedTool.washer,
      toolName: updatedTool.tool_name,
      toolType: updatedTool.tool_type,
      quantity: updatedTool.quantity,
      returnedQuantity: updatedTool.returned_quantity || 0,
      amount: updatedTool.amount,
      assignedDate: updatedTool.assigned_date,
      returnedDate: updatedTool.returned_date,
      isReturned: updatedTool.is_returned,
      notes: updatedTool.notes,
      createdAt: updatedTool.created_at,
      updatedAt: updatedTool.updated_at
    };

    return NextResponse.json({
      success: true,
      tool: transformedTool,
      message: 'Washer tool quantity updated successfully'
    });

  } catch (error) {
    console.error('Update washer tool quantity error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
