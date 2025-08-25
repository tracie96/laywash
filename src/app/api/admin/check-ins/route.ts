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
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const paymentStatus = searchParams.get('paymentStatus') || 'all';
    const sortBy = searchParams.get('sortBy') || 'check_in_time';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build the query with customer and service information
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
            category
          )
        ),
        assigned_washer:users!car_check_ins_assigned_washer_id_fkey (
          id,
          name,
          email,
          phone
        ),
        assigned_admin:users!car_check_ins_assigned_admin_id_fkey (
          id,
          name,
          email,
          phone
        )
      `)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit);

    // Apply search filter
    if (search) {
      query = query.or(`customers.name.ilike.%${search}%,customers.phone.ilike.%${search}%,license_plate.ilike.%${search}%`);
    }

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply payment status filter
    if (paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus);
    }

    const { data: checkIns, error } = await query;

    if (error) {
      console.error('Error fetching check-ins:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch check-ins' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedCheckIns = checkIns?.map(checkIn => ({
      id: checkIn.id,
      customerName: checkIn.customers?.name || 'Walk-in Customer',
      customerPhone: checkIn.customers?.phone || checkIn.customers?.email || 'N/A',
      licensePlate: checkIn.license_plate,
      vehicleType: checkIn.vehicle_type,
      vehicleColor: checkIn.vehicle_color || 'N/A',
      vehicleModel: checkIn.vehicle_model || 'N/A',
      services: checkIn.check_in_services?.map((cis: { services: { name: string } }) => cis.services?.name).filter(Boolean) || [],
      status: checkIn.status,
      checkInTime: new Date(checkIn.check_in_time),
      completedTime: checkIn.actual_completion_time ? new Date(checkIn.actual_completion_time) : undefined,
      paidTime: checkIn.payment_status === 'paid' ? checkIn.actual_completion_time ? new Date(checkIn.actual_completion_time) : undefined : undefined,
      assignedWasher: checkIn.assigned_washer?.name || 'Unassigned',
      assignedWasherId: checkIn.assigned_washer_id,
      assignedAdmin: checkIn.assigned_admin?.name || 'Unassigned',
      estimatedDuration: calculateEstimatedDuration(checkIn.check_in_services),
      actualDuration: checkIn.actual_completion_time && checkIn.check_in_time 
        ? Math.round((new Date(checkIn.actual_completion_time).getTime() - new Date(checkIn.check_in_time).getTime()) / (1000 * 60))
        : undefined,
      totalPrice: checkIn.total_amount,
      specialInstructions: checkIn.remarks || checkIn.valuable_items || undefined,
      paymentStatus: checkIn.payment_status,
      paymentMethod: checkIn.payment_method,
      customerId: checkIn.customer_id,
      createdAt: checkIn.created_at,
      updatedAt: checkIn.updated_at
    })) || [];

    return NextResponse.json({
      success: true,
      checkIns: transformedCheckIns
    });

  } catch (error) {
    console.error('Fetch check-ins error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current admin user from request header
    const currentAdminId = request.headers.get('X-Admin-ID');

    if (!currentAdminId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID not provided in headers' },
        { status: 400 }
      );
    }

    // Validate that the admin ID is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(currentAdminId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin ID format' },
        { status: 400 }
      );
    }

    // Verify that the admin user exists and has admin role
    const { data: adminUser, error: adminCheckError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', currentAdminId)
      .eq('role', 'admin')
      .single();

    if (adminCheckError || !adminUser) {
      return NextResponse.json(
        { success: false, error: 'Admin user not found or does not have admin role' },
        { status: 403 }
      );
    }

    interface ServiceSubmission {
      serviceId: string;
      workerId: string;
      customPrice?: number;
      materials: Array<{
        materialId: string;
        materialName: string;
        quantity: number;
        unit: string;
      }>;
      serviceData: {
        id: string;
        name: string;
        price: number;
        duration: number;
      };
    }

    const {
      customerName,
      customerPhone,
      customerEmail,
      licensePlate,
      vehicleType,
      vehicleColor,
      vehicleModel,
      services,
      specialInstructions,
      estimatedDuration,
      customerType,
      valuableItems,
      userCode,
      passcode,
      remarks
    }: {
      customerName: string;
      customerPhone: string;
      customerEmail: string;
      licensePlate: string;
      vehicleType: string;
      vehicleColor: string;
      vehicleModel: string;
      services: ServiceSubmission[];
      specialInstructions: string;
      estimatedDuration: number;
      customerType: string;
      valuableItems: string;
      userCode: string;
      passcode: string;
      remarks: string;
    } = await request.json();

    // Validate required fields
    if (!customerName || !customerPhone || !licensePlate || !vehicleType || !vehicleColor) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerName, customerPhone, licensePlate, vehicleType, vehicleColor are required' },
        { status: 400 }
      );
    }

    if (!services || services.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one service must be selected' },
        { status: 400 }
      );
    }

    // Validate each selected service has required fields
    for (const service of services) {
      if (!service.workerId) {
        return NextResponse.json(
          { success: false, error: 'Worker must be assigned for all services' },
          { status: 400 }
        );
      }
      if (service.materials.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Materials must be assigned for all services' },
          { status: 400 }
        );
      }
    }

    // Verify that all assigned washer IDs exist and have car_washer role
    const washerIds = [...new Set(services.map(s => s.workerId))]; // Remove duplicates
    const { data: washers, error: washerCheckError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .in('id', washerIds)
      .eq('role', 'car_washer');

    if (washerCheckError || !washers || washers.length !== washerIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more assigned workers not found or do not have car_washer role' },
        { status: 400 }
      );
    }

    // Verify that all service IDs exist and are active
    const serviceIds = services.map(s => s.serviceId);
    const { data: validServices, error: serviceCheckError } = await supabaseAdmin
      .from('services')
      .select('id, is_active')
      .in('id', serviceIds)
      .eq('is_active', true);

    if (serviceCheckError || !validServices || validServices.length !== serviceIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more services not found or are not active' },
        { status: 400 }
      );
    }

    // Create or find customer
    let customerId;
    if (customerType === 'registered' && customerEmail) {
      // Check if customer exists
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('email', customerEmail)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabaseAdmin
          .from('customers')
          .insert({
            name: customerName,
            email: customerEmail,
            phone: customerPhone
          })
          .select('id')
          .single();

        if (customerError) {
          console.error('Error creating customer:', customerError);
          return NextResponse.json(
            { success: false, error: 'Failed to create customer' },
            { status: 500 }
          );
        }
        customerId = newCustomer.id;
      }
    } else {
      // For instant customers, create a temporary record or use null
      customerId = null;
    }

    // Calculate total amount
    const totalAmount = services.reduce((total: number, service: ServiceSubmission) => {
      const serviceData = service.serviceData;
      const price = service.customPrice !== undefined ? service.customPrice : serviceData.price;
      return total + price;
    }, 0);

    // Create check-in record
    console.log('Creating check-in with data:', {
      customerId,
      licensePlate,
      vehicleType,
      vehicleColor,
      assignedWasherId: services[0].workerId,
      assignedAdminId: currentAdminId,
      totalAmount
    });

    const { data: checkIn, error: checkInError } = await supabaseAdmin
      .from('car_check_ins')
      .insert({
        customer_id: customerId,
        license_plate: licensePlate,
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel || null,
        vehicle_color: vehicleColor,
        assigned_washer_id: services[0].workerId, // Primary washer (first service)
        assigned_admin_id: currentAdminId, // Now using the actual admin ID
        status: 'pending',
        check_in_time: new Date().toISOString(),
        estimated_completion_time: new Date(Date.now() + estimatedDuration * 60 * 1000).toISOString(),
        total_amount: totalAmount,
        payment_status: 'pending',
        valuable_items: valuableItems,
        user_code: userCode || null,
        passcode: passcode || null,
        remarks: remarks || specialInstructions || null
      })
      .select('id')
      .single();

    if (checkInError) {
      console.error('Error creating check-in:', checkInError);
      return NextResponse.json(
        { success: false, error: `Failed to create check-in: ${checkInError.message}` },
        { status: 500 }
      );
    }

    console.log('Check-in created successfully with ID:', checkIn.id);

    // Create check-in services records
    for (const service of services) {
      // Create service record
      const { error: serviceError } = await supabaseAdmin
        .from('check_in_services')
        .insert({
          check_in_id: checkIn.id,
          service_id: service.serviceId,
          assigned_washer_id: service.workerId,
          custom_price: service.customPrice,
          estimated_duration: service.serviceData.duration
        });

      if (serviceError) {
        console.error('Error creating check-in service:', serviceError);
        // Continue with other services, but log the error
      }

      // Note: Material assignments are tracked in the service record for now
      // You can implement a separate check_in_materials table later if needed
      console.log(`Service ${service.serviceId} assigned to worker ${service.workerId} with ${service.materials.length} materials`);
    }

    return NextResponse.json({
      success: true,
      checkInId: checkIn.id,
      message: 'Check-in created successfully'
    });

  } catch (error) {
    console.error('Create check-in error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to calculate estimated duration based on services
function calculateEstimatedDuration(checkInServices: { services: { estimated_duration: number } }[]): number {
  if (!checkInServices || checkInServices.length === 0) {
    return 30; // Default duration
  }

  // Calculate total duration based on services
  const totalDuration = checkInServices.reduce((total, cis) => {
    const service = cis.services;
    if (service && service.estimated_duration) {
      return total + service.estimated_duration;
    }
    return total;
  }, 0);

  return totalDuration || 30; // Return calculated duration or default
}
