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

// GET - Fetch payment requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const washerId = searchParams.get('washerId');
    const status = searchParams.get('status') || '';
    const requestType = searchParams.get('requestType') || '';
    const sortBy = searchParams.get('sortBy') || 'request_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build the query
    let query = supabaseAdmin
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
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit);

    // Filter by washer ID if provided (for car washer's own requests)
    if (washerId) {
      query = query.eq('washer_id', washerId);
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply request type filter
    if (requestType) {
      query = query.eq('request_type', requestType);
    }

    const { data: paymentRequests, error } = await query;

    if (error) {
      console.error('Error fetching payment requests:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payment requests' },
        { status: 500 }
      );
    }

    // Transform the data
    const transformedRequests = (paymentRequests || []).map(request => ({
      id: request.id,
      washerId: request.washer_id,
      washerName: request.washer?.name || 'Unknown Washer',
      washerEmail: request.washer?.email || '',
      washerPhone: request.washer?.phone || '',
      requestedAmount: parseFloat(request.requested_amount || '0'),
      requestType: request.request_type,
      status: request.status,
      requestDate: request.request_date,
      periodStart: request.requested_for_period_start,
      periodEnd: request.requested_for_period_end,
      description: request.description,
      notes: request.notes,
      reviewedBy: request.reviewed_by,
      reviewerName: request.reviewer?.name || null,
      reviewedAt: request.reviewed_at,
      adminNotes: request.admin_notes,
      approvedAmount: request.approved_amount ? parseFloat(request.approved_amount) : null,
      paymentMethod: request.payment_method,
      paymentReference: request.payment_reference,
      paidAt: request.paid_at,
      createdAt: request.created_at,
      updatedAt: request.updated_at
    }));

    return NextResponse.json({
      success: true,
      paymentRequests: transformedRequests,
      total: transformedRequests.length
    });

  } catch (error) {
    console.error('Payment requests GET error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new payment request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      washerId,
      requestedAmount,
      requestType = 'salary',
      periodStart,
      periodEnd,
      description,
      notes
    } = body;

    // Validate required fields
    if (!washerId || !requestedAmount) {
      return NextResponse.json(
        { success: false, error: 'Washer ID and requested amount are required' },
        { status: 400 }
      );
    }

    if (requestedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Requested amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify washer exists and is a car washer
    const { data: washer, error: washerError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', washerId)
      .eq('role', 'car_washer')
      .single();

    if (washerError || !washer) {
      return NextResponse.json(
        { success: false, error: 'Invalid washer ID' },
        { status: 400 }
      );
    }

    // Check for pending requests to prevent duplicates
    const { data: existingRequest } = await supabaseAdmin
      .from('carwasher_payment_requests')
      .select('id')
      .eq('washer_id', washerId)
      .eq('status', 'pending')
      .eq('request_type', requestType);

    if (existingRequest && existingRequest.length > 0) {
      return NextResponse.json(
        { success: false, error: `You already have a pending ${requestType} request` },
        { status: 400 }
      );
    }

    // Create the payment request
    const { data: newRequest, error: insertError } = await supabaseAdmin
      .from('carwasher_payment_requests')
      .insert({
        washer_id: washerId,
        requested_amount: requestedAmount,
        request_type: requestType,
        requested_for_period_start: periodStart || null,
        requested_for_period_end: periodEnd || null,
        description: description || null,
        notes: notes || null,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating payment request:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create payment request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentRequest: {
        id: newRequest.id,
        washerId: newRequest.washer_id,
        requestedAmount: parseFloat(newRequest.requested_amount),
        requestType: newRequest.request_type,
        status: newRequest.status,
        requestDate: newRequest.request_date,
        periodStart: newRequest.requested_for_period_start,
        periodEnd: newRequest.requested_for_period_end,
        description: newRequest.description,
        notes: newRequest.notes,
        createdAt: newRequest.created_at
      },
      message: 'Payment request created successfully'
    });

  } catch (error) {
    console.error('Payment requests POST error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

