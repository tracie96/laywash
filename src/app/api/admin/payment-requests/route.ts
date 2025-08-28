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
    const adminId = searchParams.get('adminId');
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query = supabaseAdmin
      .from('payment_request')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // Filter by washer if specified
    if (washerId) {
      query = query.eq('washer_id', washerId);
    }

    // Filter by admin if specified
    if (adminId) {
      query = query.eq('admin_id', adminId);
    }

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status);
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
    const transformedRequests = paymentRequests?.map(request => ({
      id: request.id,
      washerId: request.washer_id,
      totalEarnings: parseFloat(request.total_earnings || '0'),
      materialDeductions: parseFloat(request.material_deductions || '0'),
      toolDeductions: parseFloat(request.tool_deductions || '0'),
      requestedAmount: parseFloat(request.total_earnings || '0') - parseFloat(request.material_deductions || '0') - parseFloat(request.tool_deductions || '0'),
      status: request.status,
      adminNotes: request.admin_notes,
      approvalDate: request.approval_date,
      createdAt: request.created_at,
      updatedAt: request.updated_at
    })) || [];

    return NextResponse.json({
      success: true,
      paymentRequests: transformedRequests
    });

  } catch (error) {
    console.error('Payment requests GET error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create payment request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { washerId, requestedAmount, materialDeductions = 0, toolDeductions = 0, notes } = body;

    if (!washerId || !requestedAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: washerId and requestedAmount' },
        { status: 400 }
      );
    }

    if (requestedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Requested amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Get washer's current earnings from car_washer_profiles
    const { data: washerProfile, error: profileError } = await supabaseAdmin
      .from('car_washer_profiles')
      .select('total_earnings')
      .eq('user_id', washerId)
      .single();

    if (profileError || !washerProfile) {
      return NextResponse.json(
        { success: false, error: 'Washer profile not found' },
        { status: 404 }
      );
    }

    const currentEarnings = washerProfile.total_earnings || 0;
    const totalRequested = requestedAmount + materialDeductions + toolDeductions;

    // Check if requested amount exceeds earnings
    if (totalRequested > currentEarnings) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Requested amount (₦${totalRequested}) exceeds available earnings (₦${currentEarnings})` 
        },
        { status: 400 }
      );
    }

    // Create payment request
    const { data: newRequest, error: createError } = await supabaseAdmin
      .from('payment_request')
      .insert({
        washer_id: washerId,
        total_earnings: currentEarnings,
        material_deductions: materialDeductions,
        tool_deductions: toolDeductions,
        status: 'pending',
        admin_notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating payment request:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create payment request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment request created successfully',
      paymentRequest: {
        id: newRequest.id,
        washerId: newRequest.washer_id,
        totalEarnings: parseFloat(newRequest.total_earnings || '0'),
        materialDeductions: parseFloat(newRequest.material_deductions || '0'),
        toolDeductions: parseFloat(newRequest.tool_deductions || '0'),
        requestedAmount: parseFloat(newRequest.total_earnings || '0') - parseFloat(newRequest.material_deductions || '0') - parseFloat(newRequest.tool_deductions || '0'),
        status: newRequest.status,
        createdAt: newRequest.created_at
      }
    });

  } catch (error) {
    console.error('Payment request POST error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
