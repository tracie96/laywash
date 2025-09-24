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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build the query to calculate total earnings from paid check-ins
    let query = supabaseAdmin
      .from('car_check_ins')
      .select('total_amount, payment_status, check_in_time')
      .eq('payment_status', 'paid');

    // Apply date filters if provided
    if (startDate) {
      const startDateTime = new Date(startDate + 'T00:00:00');
      query = query.gte('check_in_time', startDateTime.toISOString());
    }
    if (endDate) {
      const endDateTime = new Date(endDate + 'T23:59:59');
      query = query.lte('check_in_time', endDateTime.toISOString());
    }

    const { data: checkIns, error } = await query;

    if (error) {
      console.error('Error fetching earnings data:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch earnings data' },
        { status: 500 }
      );
    }

    // Calculate total earnings
    const totalEarnings = checkIns?.reduce((total, checkIn) => {
      return total + (checkIn.total_amount || 0);
    }, 0) || 0;

    // Get additional statistics
    const totalPaidCheckIns = checkIns?.length || 0;
    
    // Calculate average earnings per check-in
    const averageEarnings = totalPaidCheckIns > 0 ? totalEarnings / totalPaidCheckIns : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalEarnings,
        totalPaidCheckIns,
        averageEarnings: Math.round(averageEarnings * 100) / 100, // Round to 2 decimal places
        dateRange: {
          startDate,
          endDate
        }
      }
    });

  } catch (error) {
    console.error('Error in earnings API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
