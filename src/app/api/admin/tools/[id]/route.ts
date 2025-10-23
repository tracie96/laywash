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
  amount?: number;
  isActive?: boolean;
}

interface DatabaseUpdateFields {
  name?: string;
  description?: string;
  category?: string;
  is_returnable?: boolean;
  replacement_cost?: number;
  amount?: number;
  is_active?: boolean;
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

    if (updateData.amount !== undefined && updateData.amount < 0) {
      return NextResponse.json(
        { success: false, error: 'Amount cannot be negative' },
        { status: 400 }
      );
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
    if (updateData.amount !== undefined) updateFields.amount = updateData.amount;
    if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;
    
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
      amount: updatedTool.amount || 0,
      isActive: updatedTool.is_active || false,
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

    // First, check if the tool exists
    const { data: existingTool, error: fetchError } = await supabaseAdmin
      .from('worker_tools')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError || !existingTool) {
      return NextResponse.json(
        { success: false, error: 'Tool not found' },
        { status: 404 }
      );
    }

    // Check for dependencies - tools assigned to washers
    const { data: assignedTools, error: dependencyError } = await supabaseAdmin
      .from('washer_tools')
      .select('id, tool_name')
      .eq('tool_name', existingTool.name);

    if (dependencyError) {
      console.error('Error checking tool dependencies:', dependencyError);
      return NextResponse.json(
        { success: false, error: 'Failed to check tool dependencies' },
        { status: 500 }
      );
    }

    // If tool is assigned to washers, prevent deletion
    if (assignedTools && assignedTools.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete tool "${existingTool.name}" because it is currently assigned to ${assignedTools.length} washer(s). Please return all assigned tools before deleting.` 
        },
        { status: 400 }
      );
    }

    // Delete the tool from worker_tools table
    const { error: deleteError } = await supabaseAdmin
      .from('worker_tools')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting tool:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete tool' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Tool "${existingTool.name}" deleted successfully`
    });

  } catch (error) {
    console.error('Delete tool error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
