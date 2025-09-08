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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch customer basic information
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select(`
        *,
        vehicles:vehicles (
          id,
          license_plate,
          vehicle_type,
          vehicle_model,
          vehicle_color,
          is_primary,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Fetch customer's check-in history
    const { data: checkIns, error: checkInsError } = await supabaseAdmin
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
        assigned_washer:users!car_check_ins_assigned_washer_id_fkey (
          id,
          name,
          email,
          phone
        ),
        check_in_services (
          id,
          service_id,
          service_name,
          price,
          duration,
          services (
            id,
            name,
            description,
            base_price,
            category
          )
        )
      `)
      .eq('customer_id', id)
      .order('check_in_time', { ascending: false })
      .limit(50);

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
    }

    // Calculate statistics
    const allCheckIns = checkIns || [];
    const completedCheckIns = allCheckIns.filter(ci => ci.status === 'completed');
    const totalVisits = allCheckIns.length;
    const totalSpent = completedCheckIns.reduce((sum, ci) => sum + (ci.total_amount || 0), 0);
    const averageSpending = completedCheckIns.length > 0 ? totalSpent / completedCheckIns.length : 0;
    
    // Get last visit date
    const lastVisit = completedCheckIns.length > 0 ? completedCheckIns[0].actual_completion_time : null;
    
    // Get most used services
    const serviceUsage: { [key: string]: number } = {};
    allCheckIns.forEach(ci => {
      ci.check_in_services?.forEach(cis => {
        const serviceName = cis.service_name || 'Unknown Service';
        serviceUsage[serviceName] = (serviceUsage[serviceName] || 0) + 1;
      });
    });
    
    const mostUsedServices = Object.entries(serviceUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([service, count]) => ({ service, count }));

    // Transform check-in data
    const transformedCheckIns = allCheckIns.map(checkIn => ({
      id: checkIn.id,
      licensePlate: checkIn.license_plate,
      vehicleType: checkIn.vehicle_type,
      vehicleModel: checkIn.vehicle_model,
      vehicleColor: checkIn.vehicle_color,
      status: checkIn.status,
      checkInTime: checkIn.check_in_time,
      completedTime: checkIn.actual_completion_time,
      estimatedDuration: checkIn.estimated_completion_time,
      totalAmount: checkIn.total_amount || 0,
      paymentStatus: checkIn.payment_status,
      paymentMethod: checkIn.payment_method,
      specialInstructions: checkIn.remarks,
      valuableItems: checkIn.valuable_items,
      washType: checkIn.wash_type || 'instant',
      assignedWasher: checkIn.assigned_washer?.[0]?.name || 'Unassigned',
      services: checkIn.check_in_services?.map(cis => ({
        id: cis.id,
        name: cis.service_name,
        price: cis.price,
        duration: cis.duration,
        service: cis.services
      })) || [],
      createdAt: checkIn.created_at,
      updatedAt: checkIn.updated_at
    }));

    // Transform customer data
    const transformedCustomer = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      dateOfBirth: customer.date_of_birth,
      isRegistered: customer.is_registered,
      registrationDate: customer.registration_date,
      totalVisits,
      totalSpent,
      averageSpending,
      lastVisit,
      mostUsedServices,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
      vehicles: customer.vehicles || []
    };

    return NextResponse.json({
      success: true,
      customer: transformedCustomer,
      checkIns: transformedCheckIns,
      statistics: {
        totalVisits,
        totalSpent,
        averageSpending,
        completedVisits: completedCheckIns.length,
        lastVisit,
        mostUsedServices
      }
    });

  } catch (error) {
    console.error('Get customer details error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
