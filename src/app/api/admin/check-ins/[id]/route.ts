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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData = await request.json();

    console.log('PATCH request for check-in:', id, 'with data:', updateData);

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

    if (updateData.paymentMethod && !['cash', 'card', 'mobile_money'].includes(updateData.paymentMethod)) {
      console.log('Invalid payment method value:', updateData.paymentMethod);
      return NextResponse.json(
        { success: false, error: 'Invalid payment method value' },
        { status: 400 }
      );
    }

    // Transform frontend field names to database field names
    const dbUpdateData: { status?: string; payment_status?: string; payment_method?: string; assigned_washer_id?: string; assigned_admin_id?: string; remarks?: string; valuable_items?: string; actual_completion_time?: string; payment_time?: string } = {};
    if (updateData.status !== undefined) dbUpdateData.status = updateData.status;
    if (updateData.paymentStatus !== undefined) dbUpdateData.payment_status = updateData.paymentStatus;
    if (updateData.paymentMethod !== undefined) dbUpdateData.payment_method = updateData.paymentMethod;
    if (updateData.assignedWasherId !== undefined) dbUpdateData.assigned_washer_id = updateData.assignedWasherId;
    if (updateData.assignedAdminId !== undefined) dbUpdateData.assigned_admin_id = updateData.assignedAdminId;
    if (updateData.remarks !== undefined) dbUpdateData.remarks = updateData.remarks;
    if (updateData.valuableItems !== undefined) dbUpdateData.valuable_items = updateData.valuableItems;

    // Set completion time when status changes to completed
    if (updateData.status === 'completed' && !dbUpdateData.actual_completion_time) {
      dbUpdateData.actual_completion_time = new Date().toISOString();
    }

    // Set payment time when payment status changes to paid
    if (updateData.paymentStatus === 'paid') {
      dbUpdateData.payment_time = new Date().toISOString();
    }

    console.log('Database update data:', dbUpdateData);

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

    console.log('Check-in updated successfully:', checkIn.id, 'New status:', checkIn.status);

    // If the check-in was just completed, trigger milestone checking for the customer
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
