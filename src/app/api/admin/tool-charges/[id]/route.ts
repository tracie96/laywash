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
    if (updateData.chargeAmount !== undefined && updateData.chargeAmount < 0) {
      return NextResponse.json(
        { success: false, error: 'Charge amount cannot be negative' },
        { status: 400 }
      );
    }

    if (updateData.replacementCost !== undefined && updateData.replacementCost < 0) {
      return NextResponse.json(
        { success: false, error: 'Replacement cost cannot be negative' },
        { status: 400 }
      );
    }

    if (updateData.status !== undefined) {
      const validStatuses = ['pending', 'paid', 'disputed', 'approved', 'rejected'];
      if (!validStatuses.includes(updateData.status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }
    }

    // For now, return success with mock data
    // In a real implementation, you would update the tool_charges table
    const updatedCharge = {
      id,
      toolName: updateData.toolName || 'Pressure Washer',
      workerName: updateData.workerName || 'John Smith',
      workerId: updateData.workerId || 'worker_1',
      chargeAmount: updateData.chargeAmount !== undefined ? updateData.chargeAmount : 500.00,
      reason: updateData.reason || 'Lost during shift',
      date: updateData.date || '2024-01-15',
      status: updateData.status || 'pending',
      replacementCost: updateData.replacementCost !== undefined ? updateData.replacementCost : 500.00,
      notes: updateData.notes || 'Worker claims it was stolen from the work area',
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      charge: updatedCharge
    });

  } catch (error) {
    console.error('Update tool charge error:', error);
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
    // In a real implementation, you would delete from the tool_charges table
    // and check for dependencies before deletion

    return NextResponse.json({
      success: true,
      message: 'Tool charge deleted successfully'
    });

  } catch (error) {
    console.error('Delete tool charge error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
