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
    const period = searchParams.get('period') || 'month';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!washerId) {
      return NextResponse.json(
        { success: false, error: 'Washer ID is required' },
        { status: 400 }
      );
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'all':
        startDate = new Date('2020-01-01'); // Very old date to get all records
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
    }

    // Fetch completed check-ins for the washer
    const { data: checkIns, error: checkInsError } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        license_plate,
        vehicle_type,
        total_amount,
        washer_income,
        actual_completion_time,
        payment_status,
        customers (
          id,
          name
        ),
        check_in_services (
          services (
            id,
            name
          )
        )
      `)
      .eq('assigned_washer_id', washerId)
      .eq('status', 'completed')
      .gte('actual_completion_time', startDate.toISOString())
      .lte('actual_completion_time', now.toISOString())
      .order('actual_completion_time', { ascending: false });

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch income history' },
        { status: 500 }
      );
    }

    // Get total earnings for the washer (all time)
    const { data: totalEarningsData } = await supabaseAdmin
      .from('car_washer_profiles')
      .select('total_earnings')
      .eq('user_id', washerId)
      .single();

    const totalEarnings = totalEarningsData?.total_earnings || 0;

    // Transform the data
    const transformedRecords = (checkIns || []).map(checkIn => {
      const services = checkIn.check_in_services?.map(cs => cs.services?.[0]?.name).filter(Boolean) || [];
      
      return {
        id: checkIn.id,
        customerName: checkIn.customers?.[0]?.name || 'Walk-in Customer',
        licensePlate: checkIn.license_plate,
        vehicleType: checkIn.vehicle_type,
        services,
        amount: checkIn.washer_income || 0, // Directly use stored washer income
        completedAt: checkIn.actual_completion_time,
        paymentStatus: checkIn.payment_status || 'pending'
      };
    });

    // Calculate period-specific metrics
    const periodEarnings = transformedRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalJobs = transformedRecords.length;
    const averageEarnings = totalJobs > 0 ? periodEarnings / totalJobs : 0;

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRecords = transformedRecords.slice(startIndex, endIndex);
    const totalPages = Math.ceil(transformedRecords.length / limit);

    const summary = {
      totalEarnings,
      totalJobs,
      averageEarnings: Math.round(averageEarnings * 100) / 100,
      periodEarnings
    };

    return NextResponse.json({
      success: true,
      data: {
        records: paginatedRecords,
        summary,
        totalPages,
        currentPage: page
      }
    });

  } catch (error) {
    console.error('Worker income history API error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


