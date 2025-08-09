import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
//   auth: {
//     autoRefreshToken: false,
//     persistSession: false
//   }
// });

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

    // For now, return success with mock data
    // In a real implementation, you would update the inventory table
    const updatedItem = {
      id,
      name: updateData.name || 'Car Wash Soap',
      category: updateData.category || 'Cleaning Supplies',
      currentStock: updateData.currentStock !== undefined ? updateData.currentStock : 25,
      minStockLevel: updateData.minStockLevel !== undefined ? updateData.minStockLevel : 10,
      maxStockLevel: updateData.maxStockLevel !== undefined ? updateData.maxStockLevel : 50,
      unit: updateData.unit || 'Liters',
      price: updateData.price !== undefined ? updateData.price : 15.99,
      supplier: updateData.supplier || 'ABC Supplies',
      lastUpdated: new Date().toISOString(),
      lastRestocked: updateData.currentStock !== undefined ? new Date().toISOString() : new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      totalValue: (updateData.currentStock !== undefined ? updateData.currentStock : 25) * (updateData.price !== undefined ? updateData.price : 15.99),
      isActive: updateData.isActive !== undefined ? updateData.isActive : true
    };

    return NextResponse.json({
      success: true,
      item: updatedItem
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
  // request: NextRequest,
  //  { params }: { params: Promise<{ id: string }> }

) {
  try {
    // const { id } = await params;

    // For now, return success with mock data
    // In a real implementation, you would delete from the inventory table
    // and check for dependencies before deletion

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
