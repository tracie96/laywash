import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOutstandingCharges, markToolsCharged } from '@/lib/washerTools';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// GET - Fetch single payment request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: paymentRequest, error } = await supabaseAdmin
      .from('payment_request')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !paymentRequest) {
      return NextResponse.json(
        { success: false, error: 'Payment request not found' },
        { status: 404 }
      );
    }

    // Transform the data
    const transformedRequest = {
      id: paymentRequest.id,
      washerId: paymentRequest.washer_id,
      totalEarnings: parseFloat(paymentRequest.total_earnings || '0'),
      materialDeductions: parseFloat(paymentRequest.material_deductions || '0'),
      toolDeductions: parseFloat(paymentRequest.tool_deductions || '0'),
      requestedAmount: parseFloat(paymentRequest.amount || '0'),
      status: paymentRequest.status,
      adminNotes: paymentRequest.admin_notes,
      approvalDate: paymentRequest.approval_date,
      createdAt: paymentRequest.created_at,
      updatedAt: paymentRequest.updated_at
    };

    return NextResponse.json({
      success: true,
      paymentRequest: transformedRequest
    });

  } catch (error) {
    console.error('Payment request GET error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PATCH - Update payment request (admin actions)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      status,
      admin_notes,
      admin_id
    } = body;

    // Validate status
    if (status && !['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Check if payment request exists
    const { data: existingRequest, error: fetchError } = await supabaseAdmin
      .from('payment_request')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { success: false, error: 'Payment request not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: {
      status?: string;
      admin_id?: string;
      approval_date?: string;
      admin_notes?: string;
      updated_at?: string;
      material_deductions?: number;
      tool_deductions?: number;
    } = {};
    
    if (status !== undefined) {
      updateData.status = status;
      updateData.admin_id = admin_id;
      updateData.approval_date = new Date().toISOString();
    }
    
    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes;
    }
    
    updateData.updated_at = new Date().toISOString();

    // If marking as paid, deduct the amount from washer's total earnings
    if (status === 'paid') {
      if (existingRequest.status === 'paid') {
        return NextResponse.json(
          { success: false, error: 'Payment request is already paid' },
          { status: 400 }
        );
      }

      const paymentAmount = existingRequest.amount;
      const isAdvance = existingRequest.is_advance || false;

      let totalDeduction = paymentAmount;
      let outstanding: Awaited<ReturnType<typeof getOutstandingCharges>> | null = null;

      if (!isAdvance) {
        // Recalculate at payout so tools returned since the request aren't charged
        outstanding = await getOutstandingCharges(supabaseAdmin, existingRequest.washer_id);
        updateData.material_deductions = outstanding.deductions.materialDeductions;
        updateData.tool_deductions = outstanding.deductions.toolDeductions;
        totalDeduction += outstanding.deductions.totalDeductions;
      }

      // Deduct from the washer's current balance, not the snapshot taken at request time
      const { data: washerProfile, error: profileError } = await supabaseAdmin
        .from('car_washer_profiles')
        .select('total_earnings')
        .eq('user_id', existingRequest.washer_id)
        .single();

      if (profileError || !washerProfile) {
        console.error('Error fetching washer profile:', profileError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch washer earnings' },
          { status: 500 }
        );
      }

      // Update washer's total earnings
      const { error: earningsError } = await supabaseAdmin
        .from('car_washer_profiles')
        .update({
          total_earnings: (washerProfile.total_earnings || 0) - totalDeduction
        })
        .eq('user_id', existingRequest.washer_id);

      if (earningsError) {
        console.error('Error updating washer earnings:', earningsError);
        return NextResponse.json(
          { success: false, error: 'Failed to update washer earnings' },
          { status: 500 }
        );
      }

      // Record the charged tools so they aren't deducted again
      if (outstanding && outstanding.unreturnedItems.length > 0) {
        await markToolsCharged(supabaseAdmin, outstanding.tools, outstanding.unreturnedItems);
      }
    }

    // Update the payment request
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('payment_request')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating payment request:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update payment request' },
        { status: 500 }
      );
    }

    // Transform the response
    const transformedRequest = {
      id: updatedRequest.id,
      washerId: updatedRequest.washer_id,
      totalEarnings: parseFloat(updatedRequest.total_earnings || '0'),
      materialDeductions: parseFloat(updatedRequest.material_deductions || '0'),
      toolDeductions: parseFloat(updatedRequest.tool_deductions || '0'),
      requestedAmount: parseFloat(updatedRequest.amount || '0'),
      status: updatedRequest.status,
      adminNotes: updatedRequest.admin_notes,
      approvalDate: updatedRequest.approval_date,
      createdAt: updatedRequest.created_at,
      updatedAt: updatedRequest.updated_at
    };

    return NextResponse.json({
      success: true,
      paymentRequest: transformedRequest,
      message: 'Payment request updated successfully'
    });

  } catch (error) {
    console.error('Payment request PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel payment request (car washer can only cancel pending requests)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if payment request exists and is pending
    const { data: existingRequest, error: fetchError } = await supabaseAdmin
      .from('payment_request')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { success: false, error: 'Payment request not found' },
        { status: 404 }
      );
    }

    if (existingRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only pending requests can be cancelled' },
        { status: 400 }
      );
    }

    // Delete the payment request
    const { error: deleteError } = await supabaseAdmin
      .from('payment_request')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting payment request:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to cancel payment request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment request cancelled successfully'
    });

  } catch (error) {
    console.error('Payment request DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

