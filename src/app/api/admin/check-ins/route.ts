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
  vehicle_make?: string;
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

// Helper function to fetch all records with pagination
async function fetchAllCheckIns(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseQuery: any,
  sortBy: string,
  sortOrder: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ data: CheckIn[] | null; error: any }> {
  const allResults: CheckIn[] = [];
  const pageSize = 1000; // Supabase max per page
  let from = 0;
  let hasMore = true;

  // Apply ordering once to the base query
  const orderedQuery = baseQuery.order(sortBy, { ascending: sortOrder === 'asc' });

  while (hasMore) {
    // Create a new query with range for this page
    const query = orderedQuery.range(from, from + pageSize - 1);

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    if (data && data.length > 0) {
      allResults.push(...data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return { data: allResults, error: null };
}

export async function GET(request: NextRequest) {
  try {
    // Get current admin user from request header (optional for super admins)
    const currentAdminId = request.headers.get('X-Admin-ID');
    
    let isSuperAdmin = false;
    let locationAdminIds: string[] | null = null;
    
    // If admin ID is provided, check if they're a super admin and get location admins
    if (currentAdminId) {
      const { data: adminUser } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', currentAdminId)
        .single();
      
      isSuperAdmin = adminUser?.role === 'super_admin';
      
      // Get all admins at same location if not super admin
      if (!isSuperAdmin) {
        const { data: adminProfile } = await supabaseAdmin
          .from('admin_profiles')
          .select('location')
          .eq('user_id', currentAdminId)
          .single();
        
        if (adminProfile?.location) {
          const { data: locationAdmins } = await supabaseAdmin
            .from('admin_profiles')
            .select('user_id')
            .eq('location', adminProfile.location);
          
          locationAdminIds = locationAdmins?.map(a => a.user_id) || [];
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const paymentStatus = searchParams.get('paymentStatus') || 'all';
    const licensePlate = searchParams.get('licensePlate') || '';
    const date = searchParams.get('date') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sortBy = searchParams.get('sortBy') || 'check_in_time';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    let checkIns: CheckIn[] = [];

    if (search) {
      // Handle search by making separate queries and combining results
      // This avoids the Supabase OR syntax issues with joined tables
      
      console.log(`Searching for: "${search}"`);
      
      // Use a single query with proper filtering that actually works
      let baseQuery = supabaseAdmin
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
      
      // Filter by location (through assigned_admin_id)
      if (locationAdminIds && locationAdminIds.length > 0) {
        baseQuery = baseQuery.in('assigned_admin_id', locationAdminIds);
      }

      // Fetch all records using pagination
      const { data: allResults, error: queryError } = await fetchAllCheckIns(baseQuery, sortBy, sortOrder);

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
          const passcode = checkIn.passcode || '';
          
          const searchLower = search.toLowerCase();
          
          return customerName.toLowerCase().includes(searchLower) ||
                 customerPhone.toLowerCase().includes(searchLower) ||
                 licensePlate.toLowerCase().includes(searchLower) ||
                 userCode.toLowerCase().includes(searchLower) ||
                 passcode.toLowerCase().includes(searchLower);
        });
      }


      // Apply license plate and date filters
      if (licensePlate) {
        checkIns = checkIns.filter(checkIn => 
          checkIn.license_plate.toLowerCase() === licensePlate.toLowerCase()
        );
      }
      
      // Apply date filtering - support both single date and date range
      if (date) {
        const targetDate = new Date(date);
        checkIns = checkIns.filter(checkIn => {
          const checkInDate = new Date(checkIn.check_in_time);
          return checkInDate.toDateString() === targetDate.toDateString();
        });
      } else if (startDate || endDate) {
        checkIns = checkIns.filter(checkIn => {
          const checkInDate = new Date(checkIn.check_in_time);
          
          if (startDate && endDate) {
            const start = new Date(startDate + 'T00:00:00');
            const end = new Date(endDate + 'T23:59:59');
            return checkInDate >= start && checkInDate <= end;
          } else if (startDate) {
            const start = new Date(startDate + 'T00:00:00');
            return checkInDate >= start;
          } else if (endDate) {
            const end = new Date(endDate + 'T23:59:59');
            return checkInDate <= end;
          }
          
          return true;
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

      checkIns = filteredCheckIns;

    } else {
      // No search - use regular query with pagination
    let baseQuery = supabaseAdmin
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
      `);
    
    // Filter by location (through assigned_admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      baseQuery = baseQuery.in('assigned_admin_id', locationAdminIds);
    }

    // Apply license plate filter
    if (licensePlate) {
      baseQuery = baseQuery.eq('license_plate', licensePlate);
    }

    // Apply date filter - support both single date and date range
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      baseQuery = baseQuery
        .gte('check_in_time', targetDate.toISOString())
        .lte('check_in_time', endOfDay.toISOString());
    } else if (startDate || endDate) {
      if (startDate) {
        const start = new Date(startDate + 'T00:00:00');
        baseQuery = baseQuery.gte('check_in_time', start.toISOString());
      }
      if (endDate) {
        const end = new Date(endDate + 'T23:59:59');
        baseQuery = baseQuery.lte('check_in_time', end.toISOString());
      }
    }

    // Apply status filter
    if (status !== 'all') {
      baseQuery = baseQuery.eq('status', status);
    }

    // Apply payment status filter
    if (paymentStatus !== 'all') {
      baseQuery = baseQuery.eq('payment_status', paymentStatus);
    }

    // Fetch all records using pagination
    const { data: queryResults, error } = await fetchAllCheckIns(baseQuery, sortBy, sortOrder);

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
      vehicleMake: checkIn.vehicle_make || 'N/A',
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
      vehicleMake,
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
        vehicle_make: vehicleMake,
        remarks,
        valuable_items: valuableItems,
        assigned_washer_id: service.workerId,
        assigned_admin_id: currentAdminId,
        estimated_completion_time: new Date(Date.now() + (serviceDuration * 60 * 1000)).toISOString(),
        total_amount: serviceAmount,
        user_code: userCode || null,
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


    // Check if customer has a bonus
    let customerHasBonus = false;
    if (customerId) {
      const { data: bonuses, error: bonusError } = await supabaseAdmin
        .from('bonuses')
        .select('id, status')
        .eq('recipient_id', customerId)
        .eq('type', 'customer')
        .in('status', ['pending', 'approved']);
      
      if (!bonusError && bonuses && bonuses.length > 0) {
        customerHasBonus = true;
        console.log(`Customer ${customerId} has ${bonuses.length} active bonus(es)`);
      }
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
      
      // If customer has bonus, company income should be 0
      if (customerHasBonus) {
        companyIncome = 0;
        console.log(`Setting company income to 0 for check-in ${checkIn.id} due to customer bonus`);
      } else if (serviceDetails?.company_commission_percentage && service.serviceData.price) {
        companyIncome = (service.serviceData.price * serviceDetails.company_commission_percentage) / 100;
      }
      
      // Washer income is always calculated normally
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
      // Always set company_income, even if it's 0 (for customers with bonus)
      if (companyIncome >= 0) {
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
        vehicleMake: checkIn.vehicle_make,
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
