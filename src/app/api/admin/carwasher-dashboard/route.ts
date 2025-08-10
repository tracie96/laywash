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
    const washerId = searchParams.get('washerId');

    if (!washerId) {
      return NextResponse.json(
        { success: false, error: 'Washer ID is required' },
        { status: 400 }
      );
    }

    // Get today's date range
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    // Fetch current assignments (in_progress status)
    const { data: currentAssignments, error: assignmentsError } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        license_plate,
        vehicle_type,
        vehicle_model,
        check_in_time,
        estimated_completion_time,
        total_amount,
        customers (
          id,
          name,
          phone
        ),
        check_in_services (
          services (
            id,
            name,
            estimated_duration
          )
        )
      `)
      .eq('assigned_washer_id', washerId)
      .eq('status', 'in_progress')
      .order('check_in_time', { ascending: true });

    if (assignmentsError) {
      console.error('Error fetching current assignments:', assignmentsError);
    }

    // Fetch recently completed jobs (today)
    const { data: recentCompleted, error: completedError } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        license_plate,
        vehicle_type,
        total_amount,
        actual_completion_time,
        customers (
          id,
          name
        )
      `)
      .eq('assigned_washer_id', washerId)
      .eq('status', 'completed')
      .gte('actual_completion_time', todayStart)
      .lt('actual_completion_time', todayEnd)
      .order('actual_completion_time', { ascending: false })
      .limit(5);

    if (completedError) {
      console.error('Error fetching completed jobs:', completedError);
    }

    // Calculate today's metrics
    const todayCompleted = recentCompleted || [];
    const todayEarnings = todayCompleted.reduce((sum, job) => sum + (job.total_amount || 0), 0);
    const carsCompleted = todayCompleted.length;
    const pendingAssignments = currentAssignments?.length || 0;

    // Get total earnings for the washer
    const { data: totalEarningsData } = await supabaseAdmin
      .from('car_washer_profiles')
      .select('total_earnings')
      .eq('user_id', washerId)
      .single();

    const totalEarnings = totalEarningsData?.total_earnings || 0;

    // Transform current assignments
    const transformedAssignments = (currentAssignments || []).map(assignment => {
      const services = assignment.check_in_services?.map(cs => cs.services?.[0]?.name).filter(Boolean) || [];
      const estimatedDuration = assignment.check_in_services?.reduce((total, cs) => {
        return total + (cs.services?.[0]?.estimated_duration || 30);
      }, 0) || 30;

      return {
        id: assignment.id,
        customerName: assignment.customers?.[0]?.name || 'Walk-in Customer',
        licensePlate: assignment.license_plate,
        vehicleType: assignment.vehicle_type,
        vehicleModel: assignment.vehicle_model,
        services,
        estimatedDuration,
        checkInTime: new Date(assignment.check_in_time),
        amount: assignment.total_amount || 0
      };
    });

    // Transform recent completed
    const transformedCompleted = todayCompleted.map(completed => ({
      id: completed.id,
      customerName: completed.customers?.[0]?.name || 'Walk-in Customer',
      licensePlate: completed.license_plate,
      vehicleType: completed.vehicle_type,
      completedAt: new Date(completed.actual_completion_time),
      earnings: completed.total_amount || 0
    }));

    const dashboardData = {
      metrics: {
        todayEarnings,
        carsCompleted,
        pendingAssignments,
        totalEarnings
      },
      currentAssignments: transformedAssignments,
      recentCompleted: transformedCompleted
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Car washer dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

