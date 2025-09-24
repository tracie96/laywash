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

    // Build the query with customer information - use same structure as check-ins API
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
          id,
          service_name,
          price,
          duration
        )
      `)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit);

    // Apply search filter - use same logic as check-ins API
    if (search) {
      query = query.or(`customers.name.ilike.%${search}%,customers.phone.ilike.%${search}%,license_plate.ilike.%${search}%`);
    }

    // Apply status filter - map to payment_status like check-ins API
    if (status !== 'all') {
      const paymentStatus = status === 'completed' ? 'paid' : status;
      query = query.eq('payment_status', paymentStatus);
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
    const transformedPayments = checkIns?.map(checkIn => {
      // Extract services from check_in_services
      const services = checkIn.check_in_services?.map((cis: { service_name?: string }) => cis.service_name).filter(Boolean) || [];
      const serviceType = services.length > 0 ? services.join(', ') : 'Not specified';
      
      return {
        id: checkIn.id,
        customerName: checkIn.customers?.name || 'Walk-in Customer',
        customerPhone: checkIn.customers?.phone || 'N/A',
        amount: checkIn.total_amount || 0, // Use total_amount like check-in history
        totalPrice: checkIn.total_amount || 0, // Add totalPrice field for consistency
        date: checkIn.check_in_time,
        status: checkIn.status === 'cancelled' ? 'cancelled' : (checkIn.payment_status === 'paid' ? 'completed' : 'pending'),
        paymentMethod: checkIn.payment_method || 'Not specified',
        paymentStatus: checkIn.payment_status, // Add paymentStatus field
        serviceType: serviceType,
        services: services,
        licensePlate: checkIn.license_plate,
        vehicleType: checkIn.vehicle_type,
        vehicleModel: checkIn.vehicle_model,
        vehicleColor: checkIn.vehicle_color,
        washType: checkIn.wash_type, // Add washType field
        checkInTime: checkIn.check_in_time,
        completionTime: checkIn.actual_completion_time,
        customerId: checkIn.customer_id,
        assignedWasherId: checkIn.assigned_washer_id,
        assignedAdminId: checkIn.assigned_admin_id,
        remarks: checkIn.remarks,
        specialInstructions: checkIn.remarks || checkIn.valuable_items, // Add specialInstructions
        estimatedDuration: checkIn.check_in_services?.reduce((total: number, service: { duration?: number }) => total + (service.duration || 0), 0) || 0,
        actualDuration: checkIn.actual_completion_time && checkIn.check_in_time 
          ? Math.round((new Date(checkIn.actual_completion_time).getTime() - new Date(checkIn.check_in_time).getTime()) / (1000 * 60))
          : undefined,
        createdAt: checkIn.created_at,
        updatedAt: checkIn.updated_at,
        userCode: checkIn.user_code,
        reason: checkIn.reason,
        passcode: checkIn.passcode
      };
    }) || [];

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

