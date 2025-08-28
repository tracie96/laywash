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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const washerId = searchParams.get('washerId');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'check_in_time';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!washerId) {
      return NextResponse.json(
        { success: false, error: 'Washer ID is required' },
        { status: 400 }
      );
    }

    // Build the query with customer and service information
    let query = supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        license_plate,
        vehicle_type,
        vehicle_model,
        vehicle_color,
        status,
        check_in_time,
        actual_completion_time,
        estimated_completion_time,
        total_amount,
        payment_status,
        payment_method,
        valuable_items,
        remarks,
        created_at,
        updated_at,
        wash_type,
        customers (
          id,
          name,
          phone
        ),
        check_in_services (
          services (
            id,
            name,
            description,
            estimated_duration,
            washer_commission_percentage
          )
        )
      `)
      .eq('assigned_washer_id', washerId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit);

    // Apply search filter
    if (search) {
      query = query.or(`customers.name.ilike.%${search}%,customers.phone.ilike.%${search}%,license_plate.ilike.%${search}%`);
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    const { data: checkIns, error } = await query;

    if (error) {
      console.error('Error fetching check-ins:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch check-ins' },
        { status: 500 }
      );
    }

    // Transform the data
    const transformedCheckIns = (checkIns || []).map(checkIn => {
      const services = checkIn.check_in_services|| [];
      const estimatedDuration = checkIn.check_in_services?.reduce((total, cs) => {
        return total + (cs.services?.[0]?.estimated_duration || 30);
      }, 0) || 30;

      return {
        id: checkIn.id,
        customerName: checkIn.customers?.[0]?.name || 'Walk-in Customer',
        customerPhone: checkIn.customers?.[0]?.phone || 'N/A',
        licensePlate: checkIn.license_plate,
        vehicleType: checkIn.vehicle_type,
        vehicleColor: checkIn.vehicle_color,
        vehicleModel: checkIn.vehicle_model,
        services,
        status: checkIn.status,
        checkInTime: checkIn.check_in_time,
        completedTime: checkIn.actual_completion_time,
        estimatedDuration,
        totalPrice: checkIn.total_amount || 0,
        specialInstructions: checkIn.remarks,
        paymentStatus: checkIn.payment_status,
        paymentMethod: checkIn.payment_method,
        customerId: checkIn.customers?.[0]?.id,
        createdAt: checkIn.created_at,
        updatedAt: checkIn.updated_at,
        washType: checkIn.wash_type || 'instant'
      };
    });
    return NextResponse.json({
      success: true,
      checkIns: transformedCheckIns,
      total: transformedCheckIns.length
    });

  } catch (error) {
    console.error('My check-ins error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

