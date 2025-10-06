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
    // Get current admin user from request header (optional for super admins)
    const currentAdminId = request.headers.get('X-Admin-ID');
    
    let isSuperAdmin = false;
    let locationAdminIds: string[] | null = null;
    
    // If admin ID is provided, check if they're a super admin and get their location
    if (currentAdminId) {
      const { data: adminUser } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', currentAdminId)
        .single();
      
      isSuperAdmin = adminUser?.role === 'super_admin';
      
      // Get admin's location if not super admin
      if (!isSuperAdmin) {
        const { data: adminProfile } = await supabaseAdmin
          .from('admin_profiles')
          .select('location')
          .eq('user_id', currentAdminId)
          .single();
        
        const adminLocation = adminProfile?.location || null;
        
        // Get all admins at the same location
        if (adminLocation) {
          const { data: locationAdmins } = await supabaseAdmin
            .from('admin_profiles')
            .select('user_id')
            .eq('location', adminLocation);
          
          locationAdminIds = locationAdmins?.map(a => a.user_id) || [];
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const washerId = searchParams.get('washerId');
    const adminId = searchParams.get('adminId');
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query = supabaseAdmin
      .from('payment_request')
      .select(`
        *,
        washer:car_washer_profiles!payment_request_washer_id_fkey(
          user_id,
          users!car_washer_profiles_user_id_fkey(
            id,
            name,
            email,
            phone
          )
        )
      `)
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // Filter by washer if specified
    if (washerId) {
      query = query.eq('washer_id', washerId);
    }

    // Filter by admin - use query param if provided, or location-based filtering
    // Only filter if not super admin
    if (adminId) {
      // Specific admin filter from query param
      query = query.eq('admin_id', adminId);
    } else if (locationAdminIds && locationAdminIds.length > 0) {
      // Location-based filtering
      query = query.in('admin_id', locationAdminIds);
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

    // Transform the data and apply search filter
    let transformedRequests = paymentRequests?.map(request => ({
      id: request.id,
      washer_id: request.washer_id,
      admin_id: request.admin_id,
      approval_date: request.approval_date,
      total_earnings: parseFloat(request.total_earnings || '0'),
      material_deductions: parseFloat(request.material_deductions || '0'),
      tool_deductions: parseFloat(request.tool_deductions || '0'),
      status: request.status,
      admin_notes: request.admin_notes,
      created_at: request.created_at,
      is_advance: request.is_advance,
      updated_at: request.updated_at,
      amount: parseFloat(request.amount || '0'),
      washer: {
        id: request.washer?.user_id,
        name: request.washer?.users?.name || 'Unknown',
        email: request.washer?.users?.email || 'Unknown',
        phone: request.washer?.users?.phone || null
      }
    })) || [];

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      transformedRequests = transformedRequests.filter(request => 
        request.washer.name.toLowerCase().includes(searchLower) ||
        request.washer.email.toLowerCase().includes(searchLower) ||
        request.id.toLowerCase().includes(searchLower)
      );
    }

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
    const { washerId, requestedAmount, materialDeductions = 0, toolDeductions = 0, notes, isAdvance = false } = body;

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

    // Check if washer already has a pending payment request
    const { data: existingPendingRequest, error: pendingCheckError } = await supabaseAdmin
      .from('payment_request')
      .select('id, status, created_at')
      .eq('washer_id', washerId)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingCheckError) {
      console.error('Error checking for pending payment requests:', pendingCheckError);
      return NextResponse.json(
        { success: false, error: 'Failed to validate payment request status' },
        { status: 500 }
      );
    }

    if (existingPendingRequest) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot create new payment request. Washer already has a pending payment request.' 
        },
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

    // For advance payments, check if washer has 0 or negative earnings and amount doesn't exceed 2000
    if (isAdvance) {
      if (currentEarnings > 2000) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Advance payments can only be requested when total earnings is 2000 or negative' 
          },
          { status: 400 }
        );
      }
      
      if (requestedAmount > 2000) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Advance payment cannot exceed ₦2,000' 
          },
          { status: 400 }
        );
      }
    } else {
      // For regular payments, check if requested amount exceeds earnings
      if (totalRequested > currentEarnings) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Requested amount (₦${totalRequested}) exceeds available earnings (₦${currentEarnings})` 
          },
          { status: 400 }
        );
      }
    }

    // Note: We no longer block payment requests based on unreturned tools
    // The frontend handles showing deductions and preventing negative balances

    // For regular payments, check if remaining balance would be negative after deductions
    if (!isAdvance) {
      const remainingBalance = currentEarnings - totalRequested;
      if (remainingBalance < 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Cannot create payment request. Remaining balance would be negative (₦${remainingBalance.toLocaleString()}). Please reduce the requested amount or return some tools first.`
          },
          { status: 400 }
        );
      }
    }

    // Create payment request
    const { data: newRequest, error: createError } = await supabaseAdmin
      .from('payment_request')
      .insert({
        washer_id: washerId,
        amount: requestedAmount,
        total_earnings: currentEarnings,
        material_deductions: materialDeductions,
        tool_deductions: toolDeductions,
        status: 'pending',
        admin_notes: notes || null,
        is_advance: isAdvance,
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
        requestedAmount: parseFloat(newRequest.amount || '0'),
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
