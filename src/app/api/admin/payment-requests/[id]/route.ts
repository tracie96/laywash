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

// GET - Fetch single payment request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: paymentRequest, error } = await supabaseAdmin
      .from('carwasher_payment_requests')
      .select(`
        *,
        washer:users!carwasher_payment_requests_washer_id_fkey (
          id,
          name,
          email,
          phone
        ),
        reviewer:users!carwasher_payment_requests_reviewed_by_fkey (
          id,
          name,
          email
        )
      `)
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
      washerName: paymentRequest.washer?.name || 'Unknown Washer',
      washerEmail: paymentRequest.washer?.email || '',
      washerPhone: paymentRequest.washer?.phone || '',
      requestedAmount: parseFloat(paymentRequest.requested_amount || '0'),
      requestType: paymentRequest.request_type,
      status: paymentRequest.status,
      requestDate: paymentRequest.request_date,
      periodStart: paymentRequest.requested_for_period_start,
      periodEnd: paymentRequest.requested_for_period_end,
      description: paymentRequest.description,
      notes: paymentRequest.notes,
      reviewedBy: paymentRequest.reviewed_by,
      reviewerName: paymentRequest.reviewer?.name || null,
      reviewedAt: paymentRequest.reviewed_at,
      adminNotes: paymentRequest.admin_notes,
      approvedAmount: paymentRequest.approved_amount ? parseFloat(paymentRequest.approved_amount) : null,
      paymentMethod: paymentRequest.payment_method,
      paymentReference: paymentRequest.payment_reference,
      paidAt: paymentRequest.paid_at,
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
      adminNotes,
      approvedAmount,
      paymentMethod,
      paymentReference,
      reviewedBy
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
      .from('carwasher_payment_requests')
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
      reviewed_by?: string;
      reviewed_at?: string;
      admin_notes?: string;
      approved_amount?: number;
      payment_method?: string;
      payment_reference?: string;
      paid_at?: string;
    } = {};
    
    if (status !== undefined) {
      updateData.status = status;
      updateData.reviewed_by = reviewedBy;
      updateData.reviewed_at = new Date().toISOString();
    }
    
    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes;
    }
    
    if (approvedAmount !== undefined) {
      updateData.approved_amount = approvedAmount;
    }
    
    if (paymentMethod !== undefined) {
      updateData.payment_method = paymentMethod;
    }
    
    if (paymentReference !== undefined) {
      updateData.payment_reference = paymentReference;
    }
    
    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

    // Update the payment request
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('carwasher_payment_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        washer:users!carwasher_payment_requests_washer_id_fkey (
          id,
          name,
          email,
          phone
        ),
        reviewer:users!carwasher_payment_requests_reviewed_by_fkey (
          id,
          name,
          email
        )
      `)
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
      washerName: updatedRequest.washer?.name || 'Unknown Washer',
      washerEmail: updatedRequest.washer?.email || '',
      washerPhone: updatedRequest.washer?.phone || '',
      requestedAmount: parseFloat(updatedRequest.requested_amount || '0'),
      requestType: updatedRequest.request_type,
      status: updatedRequest.status,
      requestDate: updatedRequest.request_date,
      periodStart: updatedRequest.requested_for_period_start,
      periodEnd: updatedRequest.requested_for_period_end,
      description: updatedRequest.description,
      notes: updatedRequest.notes,
      reviewedBy: updatedRequest.reviewed_by,
      reviewerName: updatedRequest.reviewer?.name || null,
      reviewedAt: updatedRequest.reviewed_at,
      adminNotes: updatedRequest.admin_notes,
      approvedAmount: updatedRequest.approved_amount ? parseFloat(updatedRequest.approved_amount) : null,
      paymentMethod: updatedRequest.payment_method,
      paymentReference: updatedRequest.payment_reference,
      paidAt: updatedRequest.paid_at,
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
      .from('carwasher_payment_requests')
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
      .from('carwasher_payment_requests')
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

