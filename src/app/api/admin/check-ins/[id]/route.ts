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

// Function to update washer earnings directly
async function updateWasherEarnings(checkInId: string, washerId: string) {
  console.log('=== UPDATE WASHER EARNINGS FUNCTION CALLED ===');
  console.log('Check-in ID:', checkInId);
  console.log('Washer ID:', washerId);

  // Get the check-in with services and their commission percentages
  console.log('Fetching check-in data for ID:', checkInId);
  const { data: checkInData, error: checkInError } = await supabaseAdmin
    .from('car_check_ins')
    .select(`
      id,
      check_in_services (
        id,
        service_id,
        price
      )
    `)
    .eq('id', checkInId)
    .single();
    
  console.log('Check-in data result:', checkInData);
  console.log('Check-in error:', checkInError);

  if (checkInError) {
    console.error('Error fetching check-in data:', checkInError);
    throw new Error('Failed to fetch check-in data');
  }

  if (!checkInData?.check_in_services || checkInData.check_in_services.length === 0) {
    throw new Error('No check-in services found');
  }

  // Get services data separately to debug the relationship
  const serviceIds = checkInData.check_in_services.map(cis => cis.service_id);
  console.log('Service IDs found:', serviceIds);

  const { data: servicesData, error: servicesError } = await supabaseAdmin
    .from('services')
    .select('id, name, washer_commission_percentage, company_commission_percentage')
    .in('id', serviceIds);
    
  console.log('Services data result:', servicesData);
  console.log('Services error:', servicesError);

  if (servicesError) {
    console.error('Error fetching services data:', servicesError);
    throw new Error('Failed to fetch services data');
  }

  // Calculate total earnings for the washer and company income
  let totalEarnings = 0;
  let totalCompanyIncome = 0;
      
  for (const checkInService of checkInData.check_in_services) {
    
    const service = servicesData.find(s => s.id === checkInService.service_id);
    
    if (service && service.washer_commission_percentage && checkInService.price) {
      const commission = (checkInService.price * service.washer_commission_percentage) / 100;
      totalEarnings += commission;
      console.log(`Service: ${service.id}, Price: ${checkInService.price}, Commission: ${service.washer_commission_percentage}%, Earnings: ${commission}`);
    } else {
      console.log('Service data missing required fields:', {
        hasService: !!service,
        hasCommission: !!service?.washer_commission_percentage,
        hasPrice: !!checkInService.price,
        serviceId: service?.id,
        commission: service?.washer_commission_percentage,
        price: checkInService.price
      });
    }

    if (service && service.company_commission_percentage && checkInService.price) {
      const companyIncome = (checkInService.price * service.company_commission_percentage) / 100;
      totalCompanyIncome += companyIncome;
    }
  }

  if (totalEarnings === 0) {
    console.warn('No earnings calculated for washer:', washerId);
    throw new Error('No earnings calculated');
  }

  // First, get the current total earnings
  console.log('Fetching current washer profile for user_id:', washerId);
  const { data: currentProfile, error: fetchError } = await supabaseAdmin
    .from('car_washer_profiles')
    .select('total_earnings')
    .eq('user_id', washerId)
    .single();
    
  console.log('Current profile result:', currentProfile);
  console.log('Current profile error:', fetchError);

  if (fetchError) {
    console.error('Error fetching current washer profile:', fetchError);
    throw new Error('Failed to fetch washer profile');
  }

  // Calculate new total earnings
  const currentEarnings = currentProfile?.total_earnings || 0;
  const newTotalEarnings = currentEarnings + totalEarnings;
  
  console.log('Current earnings:', currentEarnings);
  console.log('New total earnings:', newTotalEarnings);
  console.log('Washer ID:', washerId);
  console.log('Total earnings:', totalEarnings);
  console.log('Total company income:', totalCompanyIncome);

  // Update the washer's total earnings in car_washer_profile
  console.log('Updating washer profile with new total earnings:', newTotalEarnings);
  const { error: updateError } = await supabaseAdmin
    .from('car_washer_profiles')
    .update({
      total_earnings: newTotalEarnings,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', washerId);
    
  console.log('Update error:', updateError);

  if (updateError) {
    console.error('Error updating washer earnings:', updateError);
    throw new Error('Failed to update washer earnings');
  }
  
  console.log('✅ Successfully updated washer earnings in database');

  const { error: companyIncomeUpdateError } = await supabaseAdmin
    .from('car_check_ins')
    .update({
      company_income: totalCompanyIncome,
      updated_at: new Date().toISOString()
    })
    .eq('id', checkInId);

  if (companyIncomeUpdateError) {
    console.error('Error updating company income:', companyIncomeUpdateError);
    throw new Error('Failed to update company income');
  }

  console.log(`Updated washer ${washerId} earnings by ${totalEarnings}`);
  console.log(`Updated company income for check-in ${checkInId} to ${totalCompanyIncome}`);

  return {
    success: true,
    message: 'Washer earnings and company income updated successfully',
    earningsAdded: totalEarnings,
    companyIncome: totalCompanyIncome
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('=== GET CHECK-IN API CALLED ===');
    
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

    // Fetch the check-in with customer and vehicle information
    const { data: checkIn, error: checkInError } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone,
          date_of_birth
        ),
        check_in_services (
          id,
          service_id,
          service_name,
          price,
          duration
        )
      `)
      .eq('id', id)
      .single();

    if (checkInError || !checkIn) {
      return NextResponse.json(
        { success: false, error: 'Check-in not found' },
        { status: 404 }
      );
    }

    // Fetch vehicle information
    let vehicleInfo = null;
    if (checkIn.customer_id) {
      const { data: vehicle, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('customer_id', checkIn.customer_id)
        .eq('is_primary', true)
        .single();

      if (!vehicleError && vehicle) {
        vehicleInfo = vehicle;
      }
    }

    // Transform the response
    const transformedCheckIn = {
      id: checkIn.id,
      customerId: checkIn.customer_id,
      customerName: checkIn.customers?.name || 'Unknown Customer',
      customerEmail: checkIn.customers?.email || '',
      customerPhone: checkIn.customers?.phone || '',
      licensePlate: checkIn.license_plate,
      vehicleType: checkIn.vehicle_type,
      vehicleColor: checkIn.vehicle_color,
      vehicleModel: checkIn.vehicle_model,
      vehicleMake: vehicleInfo?.vehicle_make || '',
      washType: checkIn.wash_type,
      specialInstructions: checkIn.remarks,
      valuableItems: checkIn.valuable_items,
      passcode: checkIn.passcode,
      userCode: checkIn.user_code,
      status: checkIn.status,
      paymentStatus: checkIn.payment_status,
      totalPrice: checkIn.total_amount,
      estimatedDuration: checkIn.estimated_duration,
      actualDuration: checkIn.actual_duration,
      checkInTime: checkIn.check_in_time,
      completedTime: checkIn.completed_time,
      paidTime: checkIn.paid_time,
      assignedWasherId: checkIn.assigned_washer_id,
      assignedAdminId: checkIn.assigned_admin_id,
      createdAt: checkIn.created_at,
      updatedAt: checkIn.updated_at,
      existingServices: checkIn.check_in_services || []
    };

    return NextResponse.json({
      success: true,
      checkIn: transformedCheckIn
    });

  } catch (error) {
    console.error('Get check-in error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Test if request body is being consumed
    console.log('Request method:', request.method);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('Request URL:', request.url);
    
    const updateData = await request.json();
    
    console.log('=== PATCH CHECK-IN UPDATE API CALLED ===');
    console.log('Check-in ID:', id);
    console.log('Received update data:', updateData);
    console.log('User ID from request:', updateData?.userId);
    console.log('Raw updateData keys:', Object.keys(updateData));
    console.log('updateData.paymentStatus:', updateData);
    console.log('updateData.paymentMethod:', updateData.paymentMethod);
    
    // Check if payment fields exist
    if (updateData.paymentStatus) {
      console.log('✅ paymentStatus found:', updateData.paymentStatus);
    } else {
      console.log('❌ paymentStatus NOT found in updateData');
    }
    
    if (updateData.paymentMethod) {
      console.log('✅ paymentMethod found:', updateData.paymentMethod);
    } else {
      console.log('❌ paymentMethod NOT found in updateData');
    }

    // Get user role for authorization checks
    let userRole = null;
    let checkInData = null;
    
    if (updateData?.userId) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', updateData.userId)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { success: false, error: 'User not found or unauthorized' },
          { status: 400 }
        );
      }
      
      userRole = userData.role;
      console.log('User role:', userRole);
    }

    // Get check-in data for validation
    if (updateData.status === 'completed' || updateData.washer_completion_status !== undefined) {
      const { data: checkInDataResult, error: fetchError } = await supabaseAdmin
        .from('car_check_ins')
        .select('assigned_washer_id, assigned_admin_id, wash_type')
        .eq('id', id)
        .single();

      if (fetchError || !checkInDataResult) {
        return NextResponse.json(
          { success: false, error: 'Check-in not found' },
          { status: 400 }
        );
      }
      
      checkInData = checkInDataResult;
    }

    // Handle status completion (for admins)
    if (updateData.status === 'completed') {
      const isWorker = userRole === 'car_washer';
      const isInstantCustomer = checkInData?.wash_type === 'instant';
      
      // Skip passcode if it's a worker OR if it's an admin with instant customer
      if (!(isWorker || isInstantCustomer)) {
        if (!updateData.passcode) {
          return NextResponse.json(
            { success: false, error: 'Passcode is required to mark check-in as completed for delayed wash customers' },
            { status: 400 }
          );
        }

        const { data: checkInPasscodeData, error: passcodeError } = await supabaseAdmin
          .from('car_check_ins')
          .select('passcode')
          .eq('id', id)
          .single();

        if (passcodeError || !checkInPasscodeData?.passcode) {
          return NextResponse.json(
            { success: false, error: 'Check-in passcode not found. Please set a passcode when creating the check-in.' },
            { status: 400 }
          );
        }

        // Verify passcode
        if (checkInPasscodeData.passcode !== updateData.passcode) {
          return NextResponse.json(
            { success: false, error: 'Invalid passcode' },
            { status: 400 }
          );
        }

        console.log('Passcode verified successfully for check-in:', id);
      } else {
        console.log('Passcode skipped for worker or instant customer, check-in:', id);
      }
    }

    // Handle washer completion status (for car_washers only)
    if (updateData.washer_completion_status !== undefined && userRole !== 'car_washer') {
      return NextResponse.json(
        { success: false, error: 'Only car washers can update washer completion status' },
        { status: 403 }
      );
    }

    // Validate the update data
    if (updateData.status && !['pending', 'in_progress', 'completed', 'paid', 'cancelled'].includes(updateData.status)) {
      console.log('Invalid status value:', updateData.status);
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    if (updateData.paymentStatus && !['pending', 'paid'].includes(updateData.paymentStatus)) {
      console.log('Invalid payment status value:', updateData.paymentStatus);
      return NextResponse.json(
        { success: false, error: 'Invalid payment status value' },
        { status: 400 }
      );
    }

    if (updateData.paymentMethod && !['cash', 'card', 'pos'].includes(updateData.paymentMethod)) {
      console.log('Invalid payment method value:', updateData.paymentMethod);
      return NextResponse.json(
        { success: false, error: 'Invalid payment method value' },
        { status: 400 }
      );
    }

    // Validate washer completion status
    if (updateData.washerCompletionStatus !== undefined && typeof updateData.washerCompletionStatus !== 'boolean') {
      console.log('Invalid washer completion status value:', updateData.washerCompletionStatus);
      return NextResponse.json(
        { success: false, error: 'Invalid washer completion status value' },
        { status: 400 }
      );
    }

    // Transform frontend field names to database field names
    const dbUpdateData: { status?: string; payment_status?: string; payment_method?: string; assigned_washer_id?: string; assigned_admin_id?: string; remarks?: string; valuable_items?: string; actual_completion_time?: string; washer_completion_status?: boolean; reason?: string; washer_income?: number; company_income?: number } = {};
    console.log('dbUpdateData keys:', Object.keys(dbUpdateData));

    // Handle status updates (for admins)
    if (updateData.status !== undefined) dbUpdateData.status = updateData.status;
    
    // Handle washer completion status (for car_washers)
    if (updateData.washerCompletionStatus !== undefined) {
      dbUpdateData.washer_completion_status = updateData.washerCompletionStatus;
      console.log('Setting washer_completion_status from washerCompletionStatus:', updateData.washerCompletionStatus);
    } else if (updateData.washer_completion_status !== undefined) {
      // Handle snake_case format from frontend
      const boolValue = updateData.washer_completion_status === 'completed' || updateData.washer_completion_status === true;
      dbUpdateData.washer_completion_status = boolValue;
      console.log('Setting washer_completion_status from washer_completion_status:', updateData.washer_completion_status, '->', boolValue);
    }
    
    // Handle other fields
    console.log('=== TRANSFORMING PAYMENT FIELDS ===');
    console.log('updateData.paymentStatus:', updateData.paymentStatus);
    console.log('updateData.paymentMethod:', updateData.paymentMethod);
    
    if (updateData.paymentStatus !== undefined) {
      dbUpdateData.payment_status = updateData.paymentStatus;
      console.log('✅ Set dbUpdateData.payment_status to:', updateData.paymentStatus);
    } else {
      console.log('❌ updateData.paymentStatus is undefined');
    }
    
    if (updateData.paymentMethod !== undefined) {
      dbUpdateData.payment_method = updateData.paymentMethod;
      console.log('✅ Set dbUpdateData.payment_method to:', updateData.paymentMethod);
    } else {
      console.log('❌ updateData.paymentMethod is undefined');
    }
    if (updateData.assignedWasherId !== undefined) dbUpdateData.assigned_washer_id = updateData.assignedWasherId;
    if (updateData.assignedAdminId !== undefined) dbUpdateData.assigned_admin_id = updateData.assignedAdminId;
    if (updateData.remarks !== undefined) dbUpdateData.remarks = updateData.remarks;
    if (updateData.reason !== undefined) dbUpdateData.reason = updateData.reason;
    if (updateData.valuableItems !== undefined) dbUpdateData.valuable_items = updateData.valuableItems;
    if (updateData.payment_method !== undefined) dbUpdateData.payment_method = updateData.payment_method;
    // Handle actual completion time
    if (updateData.actual_completion_time !== undefined) {
      dbUpdateData.actual_completion_time = updateData.actual_completion_time;
    }

    // Set completion time when status changes to completed
    if (updateData.status === 'completed' && !dbUpdateData.actual_completion_time) {
      dbUpdateData.actual_completion_time = new Date().toISOString();
    }

    // Calculate and update washer income when check-in is completed
    if (updateData.status === 'completed') {
      try {
        // Fetch check-in services to calculate washer income
        const { data: checkInServices, error: servicesError } = await supabaseAdmin
          .from('check_in_services')
          .select(`
            service_id,
            price,
            services (
              id,
              washer_commission_percentage,
              company_commission_percentage
            )
          `)
          .eq('check_in_id', id);

        if (!servicesError && checkInServices) {
          let totalWasherIncome = 0;
          let totalCompanyIncome = 0;

          for (const checkInService of checkInServices) {
            const service = Array.isArray(checkInService.services) ? checkInService.services[0] : checkInService.services;
            if (service && service.washer_commission_percentage && checkInService.price) {
              const washerIncome = (checkInService.price * service.washer_commission_percentage) / 100;
              totalWasherIncome += washerIncome;
            }
            if (service && service.company_commission_percentage && checkInService.price) {
              const companyIncome = (checkInService.price * service.company_commission_percentage) / 100;
              totalCompanyIncome += companyIncome;
            }
          }

          // Update the washer_income and company_income fields
          if (totalWasherIncome > 0) {
            dbUpdateData.washer_income = totalWasherIncome;
          }
          if (totalCompanyIncome > 0) {
            dbUpdateData.company_income = totalCompanyIncome;
          }
        }
      } catch (incomeError) {
        console.error('Error calculating washer income:', incomeError);
        // Don't fail the update if income calculation fails
      }
    }

    // Set payment time when payment status changes to paid
    if (updateData.paymentStatus === 'paid') {
      dbUpdateData.actual_completion_time = new Date().toISOString();
    }

    console.log('Final database update data:', dbUpdateData);
    console.log('Update data keys:', Object.keys(dbUpdateData));
    console.log('Final payment_status value:', dbUpdateData.payment_status);
    console.log('Final payment_method value:', dbUpdateData.payment_method);

    // Update the check-in
    const { data: checkIn, error } = await supabaseAdmin
      .from('car_check_ins')
      .update(dbUpdateData)
      .eq('id', id)
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
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
      .single();

    if (error) {
      console.error('Update check-in error:', error);
      return NextResponse.json(
        { success: false, error: `Failed to update check-in: ${error.message}` },
        { status: 500 }
      );
    }

    if (!checkIn) {
      console.log('Check-in not found after update');
      return NextResponse.json(
        { success: false, error: 'Check-in not found' },
        { status: 404 }
      );
    }

    // Fetch check-in services separately to avoid the single() issue
    const { data: checkInServices, error: servicesError } = await supabaseAdmin
      .from('check_in_services')
      .select(`
        services (
          id,
          name,
          description,
          base_price,
          category
        )
      `)
      .eq('check_in_id', id);

    if (servicesError) {
      console.error('Error fetching check-in services:', servicesError);
      // Don't fail the entire update, just log the error
    }

    console.log('Check-in updated successfully:', checkIn.id, 'New status:', checkIn.status);
console.log('dbUpdateData', dbUpdateData);
console.log('checkIn', checkIn);
    // Update washer earnings when check-in is marked as paid
    console.log('=== CHECKING EARNINGS UPDATE CONDITIONS ===');
    console.log('Payment status from updateData:', updateData.paymentStatus);
    console.log('Payment status from dbUpdateData:', dbUpdateData.payment_status);
    console.log('Assigned washer ID:', checkIn.assigned_washer_id);
    console.log('Check-in ID:', checkIn.id);
    
    if (dbUpdateData.payment_status === 'paid' && checkIn.assigned_washer_id) {
      try {
        console.log('✅ CONDITIONS MET - Updating washer earnings for check-in:', checkIn.id, 'washer:', checkIn.assigned_washer_id);
        
        // Update washer earnings directly instead of making an external API call
        await updateWasherEarnings(checkIn.id, checkIn.assigned_washer_id);
        
        console.log('Washer earnings updated successfully');
      } catch (earningsError) {
        console.error('Error updating washer earnings:', earningsError);
        // Return error to prevent inconsistent state
        return NextResponse.json(
          { success: false, error: `Payment status updated but failed to update washer earnings: ${earningsError}` },
          { status: 500 }
        );
      }
    } else {
      console.log('❌ CONDITIONS NOT MET - Skipping earnings update');
      console.log('Reason: payment_status is', dbUpdateData.payment_status, '(needs to be "paid")');
      console.log('Reason: assigned_washer_id is', checkIn.assigned_washer_id, '(needs to exist)');
    }

    if (updateData.status === 'completed' && checkIn.customers?.[0]?.id) {
      try {
        // Call milestone achievement checking API
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/milestone-achievements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId: checkIn.customers[0].id,
            forceCheck: false
          }),
        });
      } catch (milestoneError) {
        // Don't fail the check-in update if milestone checking fails
        console.error('Error checking milestones:', milestoneError);
      }
    }

    // Transform the response to match frontend interface
    const transformedCheckIn = {
      id: checkIn.id,
      customerName: checkIn.customers?.name || 'Walk-in Customer',
      customerPhone: checkIn.customers?.phone || checkIn.customers?.email || 'N/A',
      licensePlate: checkIn.license_plate,
      vehicleType: checkIn.vehicle_type,
      vehicleColor: checkIn.vehicle_color || 'N/A',
      vehicleModel: checkIn.vehicle_model || 'N/A',
      services: checkInServices?.map((cis: { services: { id: string; name: string; description: string; base_price: number; category: string }[] }) => 
        cis.services?.[0]?.name || 'Unknown Service'
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
    };

    return NextResponse.json({
      success: true,
      checkIn: transformedCheckIn
    });

  } catch (error) {
    console.error('Update check-in error:', error);
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
