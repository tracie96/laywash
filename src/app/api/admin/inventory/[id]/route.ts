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
    const updateData = await request.json();

    // Validate the update data
    if (updateData.currentStock !== undefined && updateData.currentStock < 0) {
      return NextResponse.json(
        { success: false, error: 'Current stock cannot be negative' },
        { status: 400 }
      );
    }

    if (updateData.minStockLevel !== undefined && updateData.minStockLevel < 0) {
      return NextResponse.json(
        { success: false, error: 'Minimum stock level cannot be negative' },
        { status: 400 }
      );
    }

    if (updateData.maxStockLevel !== undefined && updateData.maxStockLevel < 0) {
      return NextResponse.json(
        { success: false, error: 'Maximum stock level cannot be negative' },
        { status: 400 }
      );
    }

    if (updateData.price !== undefined && updateData.price <= 0) {
      return NextResponse.json(
        { success: false, error: 'Price must be greater than 0' },
        { status: 400 }
      );
    }

    if (updateData.minStockLevel !== undefined && updateData.maxStockLevel !== undefined) {
      if (updateData.minStockLevel >= updateData.maxStockLevel) {
        return NextResponse.json(
          { success: false, error: 'Minimum stock level must be less than maximum stock level' },
          { status: 400 }
        );
      }
    }

    // Prepare update data with correct field names
    const updateFields: Partial<{
      name: string;
      description: string;
      category: string;
      current_stock: number;
      min_stock_level: number;
      max_stock_level: number;
      unit: string;
      cost_per_unit: number;
      supplier: string;
      is_active: boolean;
      quantity: number;
      updated_at: string;
    }> = {
      updated_at: new Date().toISOString()
    };

    // Map frontend field names to database field names
    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.description !== undefined) updateFields.description = updateData.description;
    if (updateData.category !== undefined) updateFields.category = updateData.category;
    if (updateData.currentStock !== undefined) {
      updateFields.current_stock = updateData.currentStock;
      updateFields.quantity = updateData.currentStock; // Keep quantity in sync
    }
    if (updateData.minStockLevel !== undefined) updateFields.min_stock_level = updateData.minStockLevel;
    if (updateData.maxStockLevel !== undefined) updateFields.max_stock_level = updateData.maxStockLevel;
    if (updateData.unit !== undefined) updateFields.unit = updateData.unit;
    if (updateData.price !== undefined) updateFields.cost_per_unit = updateData.price;
    if (updateData.supplier !== undefined) updateFields.supplier = updateData.supplier;
    if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;

    // Update the inventory item in the database
    const { data: updatedItem, error } = await supabaseAdmin
      .from('inventory')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating inventory item:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update inventory item' },
        { status: 500 }
      );
    }

    // Transform the response to match frontend interface
    const transformedItem = {
      id: updatedItem.id,
      name: updatedItem.name,
      category: updatedItem.category,
      currentStock: updatedItem.current_stock,
      minStockLevel: updatedItem.min_stock_level,
      maxStockLevel: updatedItem.max_stock_level,
      unit: updatedItem.unit,
      price: updatedItem.cost_per_unit,
      supplier: updatedItem.supplier,
      lastUpdated: updatedItem.updated_at,
      lastRestocked: updatedItem.updated_at,
      totalValue: updatedItem.current_stock * updatedItem.cost_per_unit,
      isActive: updatedItem.is_active
    };

    return NextResponse.json({
      success: true,
      item: transformedItem
    });

  } catch (error) {
    console.error('Update inventory item error:', error);
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

    // Delete the inventory item from the database
    const { error } = await supabaseAdmin
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting inventory item:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete inventory item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });

  } catch (error) {
    console.error('Delete inventory item error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
