import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Define proper types
interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface CheckInService {
  service_name: string;
  price: number;
  duration: number;
}

interface CheckIn {
  id: string;
  customers?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  license_plate: string;
  vehicle_type: string;
  wash_type: string;
  vehicle_color?: string;
  vehicle_model?: string;
  status: string;
  check_in_time: string;
  actual_completion_time?: string;
  assigned_washer?: { name?: string };
  assigned_washer_id?: string;
  passcode?: string;
  washer_completion_status?: boolean;
  assigned_admin?: { name?: string };
  total_amount: number;
  remarks?: string;
  valuable_items?: string;
  payment_status: string;
  payment_method?: string;
  customer_id?: string;
  created_at: string;
  updated_at: string;
  user_code?: string;
  reason?: string;
  check_in_services?: CheckInService[];
  [key: string]: unknown; // For other fields we might need
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to calculate estimated duration
function calculateEstimatedDuration(services: CheckInService[]): number {
  if (!services || services.length === 0) return 0;
  return services.reduce((total, service) => total + (service.duration || 0), 0);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const paymentStatus = searchParams.get('paymentStatus') || 'all';
    const sortBy = searchParams.get('sortBy') || 'check_in_time';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');

    let checkIns: CheckIn[] = [];

    if (search) {
      // Handle search by making separate queries and combining results
      // This avoids the Supabase OR syntax issues with joined tables
      
      console.log(`Searching for: "${search}"`);
      
      // Use a single query with proper filtering that actually works
      const query = supabaseAdmin
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
            service_id,
            service_name,
            price,
            duration
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
        .limit(limit * 4); // Increase limit since we're filtering after

      // Execute the query first
      const { data: allResults, error: queryError } = await query;

      if (queryError) {
        console.error('Error fetching check-ins:', queryError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch check-ins' },
          { status: 500 }
        );
      }

      // Filter the results in JavaScript based on search criteria
      if (allResults) {
        checkIns = allResults.filter(checkIn => {
          const customerName = checkIn.customers?.name || '';
          const customerPhone = checkIn.customers?.phone || '';
          const licensePlate = checkIn.license_plate || '';
          const userCode = checkIn.user_code || '';
          
          const searchLower = search.toLowerCase();
          
          return customerName.toLowerCase().includes(searchLower) ||
                 customerPhone.toLowerCase().includes(searchLower) ||
                 licensePlate.toLowerCase().includes(searchLower) ||
                 userCode.toLowerCase().includes(searchLower);
        });
      }

      console.log(`Total results after filtering: ${checkIns.length}`);

      // Apply status and payment status filters
      let filteredCheckIns = checkIns;
      
      if (status !== 'all') {
        filteredCheckIns = filteredCheckIns.filter(checkIn => checkIn.status === status);
      }
      
      if (paymentStatus !== 'all') {
        filteredCheckIns = filteredCheckIns.filter(checkIn => checkIn.payment_status === paymentStatus);
      }

      // Sort and limit the results
      filteredCheckIns.sort((a, b) => {
        const aValue = a[sortBy] as string | number;
        const bValue = b[sortBy] as string | number;
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      checkIns = filteredCheckIns.slice(0, limit);

    } else {
      // No search - use regular query
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
          service_id,
          service_name,
          price,
          duration
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

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply payment status filter
    if (paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus);
    }

      const { data: queryResults, error } = await query;

    if (error) {
      console.error('Error fetching check-ins:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch check-ins' },
        { status: 500 }
      );
      }

      checkIns = queryResults || [];
    }

    // Transform the data to match the frontend interface
    const transformedCheckIns = checkIns?.map(checkIn => ({
      id: checkIn.id,
      customerName: checkIn.customers?.name || 'Walk-in Customer',
      customerPhone: checkIn.customers?.phone || checkIn.customers?.email || 'N/A',
      licensePlate: checkIn.license_plate,
      vehicleType: checkIn.vehicle_type,
      washType: checkIn.wash_type,
      vehicleColor: checkIn.vehicle_color || 'N/A',
      vehicleModel: checkIn.vehicle_model || 'N/A',
      services: checkIn.check_in_services?.map((cis: CheckInService) => 
        cis.service_name || 'Unknown Service'
      ).filter(Boolean) || [],
      status: checkIn.status,
      checkInTime: new Date(checkIn.check_in_time),
      completedTime: checkIn.actual_completion_time ? new Date(checkIn.actual_completion_time) : undefined,
      paidTime: checkIn.payment_status === 'paid' ? checkIn.actual_completion_time ? new Date(checkIn.actual_completion_time) : undefined : undefined,
      assignedWasher: checkIn.assigned_washer?.name || 'Unassigned',
      assignedWasherId: checkIn.assigned_washer_id,
      passcode: checkIn.passcode,
      washerCompletionStatus: checkIn.washer_completion_status || false,
      assignedAdmin: checkIn.assigned_admin?.name || 'Unassigned',
      estimatedDuration: calculateEstimatedDuration(checkIn.check_in_services || []),
      actualDuration: checkIn.actual_completion_time && checkIn.check_in_time 
        ? Math.round((new Date(checkIn.actual_completion_time).getTime() - new Date(checkIn.check_in_time).getTime()) / (1000 * 60))
        : undefined,
      totalPrice: checkIn.total_amount,
      specialInstructions: checkIn.remarks || checkIn.valuable_items || undefined,
      paymentStatus: checkIn.payment_status,
      paymentMethod: checkIn.payment_method,
      customerId: checkIn.customer_id,
      createdAt: checkIn.created_at,
      updatedAt: checkIn.updated_at,
      userCode: checkIn.user_code,
      reason: checkIn.reason
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
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', currentAdminId)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json(
        { success: false, error: 'Admin user not found' },
        { status: 404 }
      );
    }

    if (adminUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'User does not have admin privileges' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      customerId,
      licensePlate,
      vehicleType,
      washType,
      vehicleColor,
      vehicleModel,
      services,
      remarks,
      valuableItems,
      assignedWasherId,
      assignedAdminId,
      estimatedDuration,
      totalAmount,
      userCode,
      reason
    } = body;

    // Validate required fields
    if (!licensePlate || !vehicleType || !washType || !services || services.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create check-in record
    const { data: checkIn, error: checkInError } = await supabaseAdmin
      .from('car_check_ins')
      .insert({
        customer_id: customerId,
        license_plate: licensePlate,
        vehicle_type: vehicleType,
        wash_type: washType,
        vehicle_color: vehicleColor,
        vehicle_model: vehicleModel,
        remarks,
        valuable_items: valuableItems,
        assigned_washer_id: assignedWasherId,
        assigned_admin_id: assignedAdminId,
        estimated_duration: estimatedDuration,
        total_amount: totalAmount,
        user_code: userCode,
        reason,
        status: 'pending',
        payment_status: 'pending',
        check_in_time: new Date().toISOString()
      })
      .select()
      .single();

    if (checkInError) {
      console.error('Error creating check-in:', checkInError);
      return NextResponse.json(
        { success: false, error: 'Failed to create check-in' },
        { status: 500 }
      );
    }

    // Create check-in services records
    if (services && services.length > 0) {
      const checkInServices = services.map((service: Service) => ({
        check_in_id: checkIn.id,
        service_id: service.id,
        service_name: service.name,
        price: service.price,
        duration: service.duration
      }));

      const { error: servicesError } = await supabaseAdmin
        .from('check_in_services')
        .insert(checkInServices);

      if (servicesError) {
        console.error('Error creating check-in services:', servicesError);
        // Note: We don't fail here as the check-in was created successfully
      }
    }

    return NextResponse.json({
      success: true,
      checkIn: {
        id: checkIn.id,
        customerId: checkIn.customer_id,
        licensePlate: checkIn.license_plate,
        vehicleType: checkIn.vehicle_type,
        washType: checkIn.wash_type,
        vehicleColor: checkIn.vehicle_color,
        vehicleModel: checkIn.vehicle_model,
        remarks: checkIn.remarks,
        valuableItems: checkIn.valuable_items,
        assignedWasherId: checkIn.assigned_washer_id,
        assignedAdminId: checkIn.assigned_admin_id,
        estimatedDuration: checkIn.estimated_duration,
        totalAmount: checkIn.total_amount,
        userCode: checkIn.user_code,
        reason: checkIn.reason,
        status: checkIn.status,
        paymentStatus: checkIn.payment_status,
        checkInTime: checkIn.check_in_time,
        createdAt: checkIn.created_at
      }
    });

  } catch (error) {
    console.error('Create check-in error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
