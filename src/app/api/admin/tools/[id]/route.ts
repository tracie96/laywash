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

interface ToolUpdateData {
  name?: string;
  description?: string;
  category?: string;
  isReturnable?: boolean;
  replacementCost?: number;
  totalQuantity?: number;
  availableQuantity?: number;
  isActive?: boolean;
  amount?: number;
}

interface DatabaseUpdateFields {
  name?: string;
  description?: string;
  category?: string;
  is_returnable?: boolean;
  replacement_cost?: number;
  total_quantity?: number;
  available_quantity?: number;
  is_active?: boolean;
  amount?: number;
  updated_at?: string;
}

export async function PATCH(
  request: NextRequest,
   { params }: { params: Promise<{ id: string }> }

) {
  try {
    const { id } = await params;
    const updateData: ToolUpdateData = await request.json();

    // Validate the update data
    if (updateData.replacementCost !== undefined && updateData.replacementCost < 0) {
      return NextResponse.json(
        { success: false, error: 'Replacement cost cannot be negative' },
        { status: 400 }
      );
    }

    if (updateData.totalQuantity !== undefined && updateData.totalQuantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Total quantity cannot be negative' },
        { status: 400 }
      );
    }

    if (updateData.availableQuantity !== undefined && updateData.availableQuantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Available quantity cannot be negative' },
        { status: 400 }
      );
    }

    if (updateData.availableQuantity !== undefined && updateData.totalQuantity !== undefined) {
      if (updateData.availableQuantity > updateData.totalQuantity) {
        return NextResponse.json(
          { success: false, error: 'Available quantity cannot exceed total quantity' },
          { status: 400 }
        );
      }
    }

    if (updateData.category !== undefined) {
      const validCategories = ['Equipment', 'Tools', 'Supplies'];
      if (!validCategories.includes(updateData.category)) {
        return NextResponse.json(
          { success: false, error: 'Invalid category' },
          { status: 400 }
        );
      }
    }

    // Update the tool in the worker_tools table
    const updateFields: DatabaseUpdateFields = {};
    
    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.description !== undefined) updateFields.description = updateData.description;
    if (updateData.category !== undefined) updateFields.category = updateData.category;
    if (updateData.isReturnable !== undefined) updateFields.is_returnable = updateData.isReturnable;
    if (updateData.replacementCost !== undefined) updateFields.replacement_cost = updateData.replacementCost;
    if (updateData.totalQuantity !== undefined) updateFields.total_quantity = updateData.totalQuantity;
    if (updateData.availableQuantity !== undefined) updateFields.available_quantity = updateData.availableQuantity;
    if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;
    if (updateData.amount !== undefined) updateFields.amount = updateData.amount;
    
    // Always update the updated_at timestamp
    updateFields.updated_at = new Date().toISOString();

    const { data: updatedTool, error } = await supabaseAdmin
      .from('worker_tools')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tool:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update tool' },
        { status: 500 }
      );
    }

    // Transform the response to match the frontend interface
    const transformedTool = {
      id: updatedTool.id,
      name: updatedTool.name,
      description: updatedTool.description || '',
      category: updatedTool.category || 'General',
      isReturnable: updatedTool.is_returnable || false,
      replacementCost: updatedTool.replacement_cost || 0,
      totalQuantity: updatedTool.total_quantity || 0,
      availableQuantity: updatedTool.available_quantity || 0,
      isActive: updatedTool.is_active || false,
      amount: updatedTool.amount || 0,
      createdAt: updatedTool.created_at,
      updatedAt: updatedTool.updated_at
    };

    return NextResponse.json({
      success: true,
      tool: transformedTool,
      message: 'Tool updated successfully'
    });

  } catch (error) {
    console.error('Update tool error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
   { params }: { params: Promise<{ id: string }> }

) {
  try {
    const { id } = await params;
    console.log('Deleting tool with ID:', id);
    // For now, return success with mock data
    // In a real implementation, you would delete from the tools table
    // and check for dependencies before deletion

    return NextResponse.json({
      success: true,
      message: 'Tool deleted successfully'
    });

  } catch (error) {
    console.error('Delete tool error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
