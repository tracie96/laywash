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
    console.log('Worker details API called with ID:', id); // Debug log

    // Fetch worker details
    const { data: worker, error: workerError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        role,
        is_active,
        created_at,
        updated_at,
        car_washer_profiles!car_washer_profiles_user_id_fkey (
          assigned_admin_id,
          total_earnings,
          is_available,
          assigned_location,
          address,
          next_of_kin,
          bank_information,
          picture_url
        )
      `)
      .eq('id', id)
      .eq('role', 'car_washer')
      .single();

    console.log('Worker query result:', worker, 'Error:', workerError); // Debug log

    if (workerError) {
      console.error('Error fetching worker:', workerError);
      return NextResponse.json(
        { success: false, error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Fetch assigned admin name
    const profile = Array.isArray(worker?.car_washer_profiles) 
      ? worker?.car_washer_profiles?.[0] 
      : worker?.car_washer_profiles;
    console.log('Profile:', profile);
    let assignedAdminName = 'Unassigned';
    
    if (profile?.assigned_admin_id) {
      const { data: admin } = await supabaseAdmin
        .from('users')
        .select('name')
        .eq('id', profile.assigned_admin_id)
        .eq('role', 'admin')
        .single();
      
      if (admin) {
        assignedAdminName = admin.name;
      }
    }

    // Fetch worker's check-in history with customer and service details
    const { data: checkIns, error: checkInsError } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        total_amount,
        payment_status,
        check_in_time,
        actual_completion_time,
        estimated_completion_time,
        license_plate,    
        vehicle_type,
        washer_income,
        vehicle_model,
        vehicle_color,
        status,
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
            base_price,
            category
          )
        )
      `)
      .eq('assigned_washer_id', id)
      .eq('status', 'completed')
      .order('actual_completion_time', { ascending: false })
      .limit(20); 

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
    }

    const completedCheckIns = checkIns || [];
    
    const { data: allCheckIns } = await supabaseAdmin
      .from('car_check_ins')
      .select('id, status')
      .eq('assigned_washer_id', id);

    const totalAllCheckIns = allCheckIns?.length || 0;
    const actualCompletedCount = allCheckIns?.filter(c => c.status === 'completed').length || 0;

    const carWashHistory = completedCheckIns.map(checkIn => {
      const serviceName = checkIn.check_in_services?.[0]?.services?.[0]?.name || 'Car Wash';
      const duration = checkIn.actual_completion_time && checkIn.check_in_time
        ? Math.round((new Date(checkIn.actual_completion_time).getTime() - new Date(checkIn.check_in_time).getTime()) / (1000 * 60))
        : checkIn.estimated_completion_time || 30;

      return {
        id: checkIn.id,
        carModel: `${checkIn.vehicle_model || 'Unknown'} ${checkIn.vehicle_type || 'Vehicle'}`.trim(),
        color: checkIn.vehicle_color || 'Unknown',
        licensePlate: checkIn.license_plate || 'N/A',
        serviceType: serviceName,
        price: checkIn.washer_income || 0,
        rating: 4.5, // TODO: Implement actual rating system
        completedAt: new Date(checkIn.actual_completion_time || checkIn.check_in_time),
        duration,
        customerName: checkIn.customers?.[0]?.name || 'Walk-in Customer',
        customerPhone: checkIn.customers?.[0]?.phone || 'N/A'
      };
    });

    // Transform worker data
    const transformedWorker = {
      id: worker.id,
      name: worker.name,
      email: worker.email,
      phone: worker.phone,
      totalEarnings: profile?.total_earnings || 0,
      isAvailable: profile?.is_available ?? true,
      assignedAdminId: profile?.assigned_admin_id || null,
      assignedAdminName,
      totalCheckIns: totalAllCheckIns,
      completedCheckIns: actualCompletedCount,
      averageRating: 4.5, 
      createdAt: new Date(worker.created_at),
      lastActive: new Date(worker.updated_at),
      assigned_location: profile?.assigned_location || "Not specified",
      address: profile?.address || 'Address not provided',
      emergencyContact: profile?.next_of_kin?.[0]?.name || 'Not provided',
      emergencyPhone: profile?.next_of_kin?.[0]?.phone || 'Not provided',
      next_of_kin: profile?.next_of_kin || [],
      bank_information: profile?.bank_information || null,
      skills: ['Car Washing', 'Customer Service'],
      certifications: [],
      notes: 'No additional notes.',
      picture_url: profile?.picture_url || null
    };

    return NextResponse.json({
      success: true,
      worker: transformedWorker,
      carWashHistory
    });

  } catch (error) {
    console.error('Worker details error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
