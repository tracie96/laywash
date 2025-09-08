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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
    const { services } = body;

    // Validate required fields
    if (!services || services.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No services provided to add' },
        { status: 400 }
      );
    }

    // First, check if the check-in exists and is not completed
    const { data: existingCheckIn, error: checkInError } = await supabaseAdmin
      .from('car_check_ins')
      .select('id, status, customer_id, license_plate, vehicle_type, wash_type, vehicle_color, vehicle_model, remarks, valuable_items, user_code, passcode, reason')
      .eq('id', id)
      .single();

    if (checkInError || !existingCheckIn) {
      return NextResponse.json(
        { success: false, error: 'Check-in not found' },
        { status: 404 }
      );
    }

    // Check if check-in is already completed
    if (existingCheckIn.status === 'completed' || existingCheckIn.status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Cannot add services to completed or paid check-ins' },
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

    // Create separate check-ins for each new service
    const createdCheckIns = [];
    
    for (const service of services) {
      const serviceDuration = service.serviceData.duration || 30; // Default 30 minutes if not specified
      const serviceAmount = service.serviceData.price || 0;
      
      const insertData = {
        customer_id: existingCheckIn.customer_id,
        license_plate: existingCheckIn.license_plate,
        vehicle_type: existingCheckIn.vehicle_type,
        wash_type: existingCheckIn.wash_type,
        vehicle_color: existingCheckIn.vehicle_color,
        vehicle_model: existingCheckIn.vehicle_model,
        remarks: existingCheckIn.remarks,
        valuable_items: existingCheckIn.valuable_items,
        assigned_washer_id: service.workerId,
        assigned_admin_id: currentAdminId,
        estimated_completion_time: new Date(Date.now() + (serviceDuration * 60 * 1000)).toISOString(),
        total_amount: serviceAmount,
        user_code: existingCheckIn.user_code,
        passcode: existingCheckIn.passcode,
        reason: existingCheckIn.reason,
        status: 'pending',
        payment_status: 'pending',
        check_in_time: new Date().toISOString()
      };
      
      console.log('Creating additional check-in for service:', service.serviceData.name, 'with worker:', service.workerId);

      const { data: checkIn, error: checkInError } = await supabaseAdmin
        .from('car_check_ins')
        .insert(insertData)
        .select()
        .single();

      if (checkInError) {
        console.error('Error creating additional check-in for service:', service.serviceData.name, checkInError);
        return NextResponse.json(
          { success: false, error: `Failed to create check-in for service: ${service.serviceData.name}` },
          { status: 500 }
        );
      }
      
      createdCheckIns.push({ checkIn, service });
    }

    // Create service records for each new check-in
    for (const { checkIn, service } of createdCheckIns) {
      // Fetch service details including company_commission_percentage from services table
      const { data: serviceDetails, error: serviceDetailsError } = await supabaseAdmin
        .from('services')
        .select('id, company_commission_percentage')
        .eq('id', service.serviceData.id)
        .single();

      if (serviceDetailsError) {
        console.error('Error fetching service details for:', service.serviceData.name, serviceDetailsError);
        // Continue without company income calculation
      }

      let companyIncome = 0;
      
      if (serviceDetails?.company_commission_percentage && service.serviceData.price) {
        companyIncome = (service.serviceData.price * serviceDetails.company_commission_percentage) / 100;
      }
      
      const checkInService = {
        check_in_id: checkIn.id,
        service_id: service.serviceData.id,
        service_name: service.serviceData.name,
        price: service.serviceData.price,
        company_income: companyIncome,    
        duration: service.serviceData.duration
      };

      const { error: servicesError } = await supabaseAdmin
        .from('check_in_services')
        .insert(checkInService);

      if (servicesError) {
        console.error('Error creating check-in service for:', service.serviceData.name, servicesError);
        // Note: We don't fail here as the check-in was created successfully
      }

      // Update the check-in with the calculated company income
      if (companyIncome > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('car_check_ins')
          .update({ company_income: companyIncome })
          .eq('id', checkIn.id);

        if (updateError) {
          console.error('Error updating company income:', updateError);
          // Note: We don't fail here as the check-in was created successfully
        } else {
          console.log(`Updated company income for check-in ${checkIn.id} to ${companyIncome}`);
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
      message: `Successfully created ${createdCheckIns.length} new check-in(s) for additional services`,
      originalCheckInId: id,
      newCheckIns: createdCheckIns.map(({ checkIn, service }) => ({
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
    console.error('Edit check-in error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
