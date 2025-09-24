import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Define proper types
interface ServiceData {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface CheckInServiceItem {
  serviceId: string;
  workerId: string;
  materials: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
  }>;
  serviceData: ServiceData;
}

// Database interface for check_in_materials table
interface CheckInMaterialDB {
  check_in_id: string;
  washer_id: string;
  material_id: string;
  material_name: string;
  quantity_used: number;
  amount: number;
  usage_date: string;
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
    const licensePlate = searchParams.get('licensePlate') || '';
    const date = searchParams.get('date') || '';
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

      // Apply license plate and date filters
      if (licensePlate) {
        checkIns = checkIns.filter(checkIn => 
          checkIn.license_plate.toLowerCase() === licensePlate.toLowerCase()
        );
      }
      
      if (date) {
        const targetDate = new Date(date);
        checkIns = checkIns.filter(checkIn => {
          const checkInDate = new Date(checkIn.check_in_time);
          return checkInDate.toDateString() === targetDate.toDateString();
        });
      }

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

    // Apply license plate filter
    if (licensePlate) {
      query = query.eq('license_plate', licensePlate);
    }

    // Apply date filter
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query = query
        .gte('check_in_time', startDate.toISOString())
        .lte('check_in_time', endDate.toISOString());
    }

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
      securityCode,
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


    // Validate that all services have workers assigned
    const servicesWithoutWorkers = services.filter((service: CheckInServiceItem) => !service.workerId);
    if (servicesWithoutWorkers.length > 0) {
      return NextResponse.json(
        { success: false, error: 'All services must have a worker assigned' },
        { status: 400 }
      );
    }
    
    // Get all unique worker IDs
    const workerIds = [...new Set(services.map((service: CheckInServiceItem) => service.workerId))];
    
    // Validate all worker ID formats
    for (const workerId of workerIds) {
      if (!uuidRegex.test(workerId as string)) {
        return NextResponse.json(
          { success: false, error: `Invalid worker ID format: ${workerId}` },
          { status: 400 }
        );
      }
    }
    
    // Validate that all workers exist
    const { data: workers, error: workersError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .in('id', workerIds)
      .eq('role', 'car_washer');
      
    if (workersError || !workers || workers.length !== workerIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more workers not found or invalid role' },
        { status: 400 }
      );
    }
    
    // Validate admin ID
    if (!currentAdminId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID is required' },
        { status: 400 }
      );
    }
    
    // Create separate check-ins for each service
    const createdCheckIns = [];
    
    for (const service of services) {
      const serviceDuration = service.serviceData.duration || 30; // Default 30 minutes if not specified
      const serviceAmount = service.serviceData.price || 0;
      
      const insertData = {
        customer_id: customerId || null,
        license_plate: licensePlate,
        vehicle_type: vehicleType,
        wash_type: washType,
        vehicle_color: vehicleColor,
        vehicle_model: vehicleModel,
        remarks,
        valuable_items: valuableItems,
        assigned_washer_id: service.workerId,
        assigned_admin_id: currentAdminId,
        estimated_completion_time: new Date(Date.now() + (serviceDuration * 60 * 1000)).toISOString(),
        total_amount: serviceAmount,
        user_code: userCode,
        passcode: securityCode,
        reason,
        status: 'pending',
        payment_status: 'pending',
        check_in_time: new Date().toISOString()
      };
      
      console.log('Creating check-in for service:', service.serviceData.name, 'with worker:', service.workerId);

      const { data: checkIn, error: checkInError } = await supabaseAdmin
        .from('car_check_ins')
        .insert(insertData)
        .select()
        .single();

      if (checkInError) {
        console.error('Error creating check-in for service:', service.serviceData.name, checkInError);
        return NextResponse.json(
          { success: false, error: `Failed to create check-in for service: ${service.serviceData.name}` },
          { status: 500 }
        );
      }
      
      createdCheckIns.push({ checkIn, service });
    }


    // Create service records for each check-in
    for (const { checkIn, service } of createdCheckIns) {
      // Fetch service details including commission percentages from services table
      const { data: serviceDetails, error: serviceDetailsError } = await supabaseAdmin
        .from('services')
        .select('id, company_commission_percentage, washer_commission_percentage')
        .eq('id', service.serviceData.id)
        .single();

      if (serviceDetailsError) {
        console.error('Error fetching service details for:', service.serviceData.name, serviceDetailsError);
        // Continue without income calculation
      }

      let companyIncome = 0;
      let washerIncome = 0;
      
      if (serviceDetails?.company_commission_percentage && service.serviceData.price) {
        companyIncome = (service.serviceData.price * serviceDetails.company_commission_percentage) / 100;
      }
      
      if (serviceDetails?.washer_commission_percentage && service.serviceData.price) {
        washerIncome = (service.serviceData.price * serviceDetails.washer_commission_percentage) / 100;
      }
      
      const checkInService = {
        check_in_id: checkIn.id,
        service_id: service.serviceData.id,
        service_name: service.serviceData.name,
        price: service.serviceData.price,
        // company_income: companyIncome,
        // washer_income: washerIncome,
        duration: service.serviceData.duration
      };

      const { error: servicesError } = await supabaseAdmin
        .from('check_in_services')
        .insert(checkInService);

      if (servicesError) {
        console.error('Error creating check-in service for:', service.serviceData.name, servicesError);
        // Note: We don't fail here as the check-in was created successfully
      }

      // Update the check-in with the calculated incomes
      const updateData: { company_income?: number; washer_income?: number } = {};
      if (companyIncome > 0) {
        updateData.company_income = companyIncome;
      }
      if (washerIncome > 0) {
        updateData.washer_income = washerIncome;
      }
      
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('car_check_ins')
          .update(updateData)
          .eq('id', checkIn.id);

        if (updateError) {
          console.error('Error updating incomes:', updateError);
          // Note: We don't fail here as the check-in was created successfully
        } else {
          console.log(`Updated incomes for check-in ${checkIn.id}: company=${companyIncome}, washer=${washerIncome}`);
        }
      }

      // Store materials for this specific service in check_in_materials table
      const checkInMaterials: CheckInMaterialDB[] = [];
      
      if (service.materials && service.materials.length > 0) {
        for (const material of service.materials) {
          checkInMaterials.push({
            check_in_id: checkIn.id,
            washer_id: service.workerId,
            material_id: material.materialId,
            material_name: material.materialName,
            quantity_used: material.quantity,
            amount: 0, // Default amount, can be updated later if needed
            usage_date: new Date().toISOString()
          });
        }
      }
console.log('Check-in materials:', checkInMaterials);
      if (checkInMaterials.length > 0) {
        console.log('Inserting check-in materials:', checkInMaterials);
        
        // Insert materials, handling potential conflicts gracefully
        const { error: materialsError } = await supabaseAdmin
          .from('check_in_materials')
          .insert(checkInMaterials);

        if (materialsError) {
          // If it's a unique constraint violation, log it but don't fail
          if (materialsError.code === '23505') {
            console.log('Some materials already exist for this check-in, skipping duplicates');
          } else {
            console.error('Error creating check-in materials:', materialsError);
          }
          // Note: We don't fail here as the check-in was created successfully
        } else {
          console.log('Successfully stored materials for check-in:', checkIn.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdCheckIns.length} check-in(s)`,
      checkIns: createdCheckIns.map(({ checkIn, service }) => ({
        id: checkIn.id,
        serviceName: service.serviceData.name,
        workerId: service.workerId,
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
        estimatedDuration: service.serviceData.duration,
        totalAmount: checkIn.total_amount,
        userCode: checkIn.user_code,
        reason: checkIn.reason,
        status: checkIn.status,
        paymentStatus: checkIn.payment_status,
        checkInTime: checkIn.check_in_time,
        createdAt: checkIn.created_at
      }))
    });

  } catch (error) {
    console.error('Create check-in error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
