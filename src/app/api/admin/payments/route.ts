import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client on server-side only
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const paymentMethod = searchParams.get('paymentMethod') || 'all';
    const sortBy = searchParams.get('sortBy') || 'check_in_time';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build the query with customer information
    let query = supabaseAdmin
      .from('car_check_ins')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        ),
        check_in_services (
          services (
            id,
            name,
            description,
            base_price,
            category,
            company_commission_percentage
          )
        )
      `)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit);

    // Apply search filter
    if (search) {
      query = query.or(`customers.name.ilike.%${search}%,customers.phone.ilike.%${search}%`);
    }

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('payment_status', status);
    }

    // Apply payment method filter
    if (paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod);
    }

    const { data: checkIns, error } = await query;

    if (error) {
      console.error('Fetch payments error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedPayments = checkIns?.map(checkIn => ({
      id: checkIn.id,
      customerName: checkIn.customers?.name || 'Walk-in Customer',
      amount: checkIn.company_income || 0,
      date: checkIn.check_in_time,
      status: checkIn.payment_status === 'paid' ? 'completed' : 'pending',
      paymentMethod: checkIn.payment_method || 'Not specified',
      serviceType: checkIn.check_in_services?.map((cis: { services?: { name?: string }[] }) => cis.services?.[0]?.name).filter(Boolean).join(', ') || 'Not specified',
      licensePlate: checkIn.license_plate,
      vehicleType: checkIn.vehicle_type,
      vehicleModel: checkIn.vehicle_model,
      vehicleColor: checkIn.vehicle_color,
      checkInTime: checkIn.check_in_time,
      completionTime: checkIn.actual_completion_time,
      customerId: checkIn.customer_id,
      assignedWasherId: checkIn.assigned_washer_id,
      assignedAdminId: checkIn.assigned_admin_id,
      remarks: checkIn.remarks
    })) || [];

    return NextResponse.json({
      success: true,
      payments: transformedPayments
    });

  } catch (error) {
    console.error('Fetch payments error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

