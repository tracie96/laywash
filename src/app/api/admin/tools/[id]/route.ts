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

    // For now, return success with mock data
    // In a real implementation, you would update the tools table
    const updatedTool = {
      id,
      name: updateData.name || 'Pressure Washer',
      description: updateData.description || 'High-pressure water cleaning equipment',
      category: updateData.category || 'Equipment',
      isReturnable: updateData.isReturnable !== undefined ? updateData.isReturnable : true,
      replacementCost: updateData.replacementCost !== undefined ? updateData.replacementCost : 500.00,
      totalQuantity: updateData.totalQuantity !== undefined ? updateData.totalQuantity : 5,
      availableQuantity: updateData.availableQuantity !== undefined ? updateData.availableQuantity : 3,
      isActive: updateData.isActive !== undefined ? updateData.isActive : true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      tool: updatedTool
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
