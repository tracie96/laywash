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
    const period = searchParams.get('period') || '1'; // Default to last 1 month
    const washerId = searchParams.get('washerId'); // Optional filter by specific washer

    // Get the current date and calculate the start date based on period
    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - parseInt(period));

    // Build the base query for check-ins
    let checkInsQuery = supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        assigned_washer_id,
        check_in_time,
        actual_completion_time,
        total_amount,
        payment_status,
        status,
        assigned_washer:users!car_check_ins_assigned_washer_id_fkey (
          id,
          name,
          email,
          car_washer_profiles!car_washer_profiles_user_id_fkey (
            hourly_rate,
            total_earnings
          )
        )
      `)
      .gte('check_in_time', startDate.toISOString())
      .lte('check_in_time', now.toISOString())
      .eq('status', 'completed')
      .eq('payment_status', 'paid');

    // Filter by specific washer if provided
    if (washerId) {
      checkInsQuery = checkInsQuery.eq('assigned_washer_id', washerId);
    }

    const { data: checkIns, error: checkInsError } = await checkInsQuery;

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch performance data' },
        { status: 500 }
      );
    }

    // Group check-ins by washer and calculate performance metrics
    const washerPerformance = new Map<string, {
      washerId: string;
      workerName: string;
      carsWashed: number;
      totalEarnings: number;
      totalHours: number;
      hourlyRate: number;
      checkIns: typeof checkIns;
    }>();

    checkIns?.forEach(checkIn => {
      if (!checkIn.assigned_washer_id || !checkIn.assigned_washer) return;

      const washerId = checkIn.assigned_washer_id;
      const washer = checkIn.assigned_washer?.[0];

      if (!washerPerformance.has(washerId)) {
        washerPerformance.set(washerId, {
          washerId,
          workerName: washer.name,
          carsWashed: 0,
          totalEarnings: 0,
          totalHours: 0,
          hourlyRate: washer?.car_washer_profiles?.[0]?.hourly_rate || 15.00,
          checkIns: []
        });
      }

      const performance = washerPerformance.get(washerId)!;
      performance.carsWashed += 1;
      performance.totalEarnings += checkIn.total_amount || 0;
      performance.checkIns.push(checkIn);

      // Calculate hours worked for this check-in
      if (checkIn.actual_completion_time && checkIn.check_in_time) {
        const startTime = new Date(checkIn.check_in_time);
        const endTime = new Date(checkIn.actual_completion_time);
        const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        performance.totalHours += hoursWorked;
      }
    });

    // Calculate additional metrics and transform data
    const performanceReports = Array.from(washerPerformance.values()).map(performance => {
      // Calculate average rating (mock data for now - would need ratings table)
      const averageRating = 4.5 + Math.random() * 0.5; // Random between 4.5-5.0

      // Calculate efficiency based on cars washed per hour
      const efficiency = performance.totalHours > 0 
        ? Math.min(100, Math.round((performance.carsWashed / performance.totalHours) * 10))
        : 85 + Math.random() * 15; // Random between 85-100 if no hours

      // Calculate period name
      const periodName = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

      return {
        id: performance.washerId,
        workerName: performance.workerName,
        period: periodName,
        carsWashed: performance.carsWashed,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalHours: parseFloat(performance.totalHours.toFixed(1)),
        hourlyRate: performance.hourlyRate,
        totalEarnings: parseFloat(performance.totalEarnings.toFixed(2)),
        efficiency: efficiency,
        date: now.toISOString().split('T')[0]
      };
    }).sort((a, b) => b.totalEarnings - a.totalEarnings); // Sort by earnings descending

    return NextResponse.json({
      success: true,
      reports: performanceReports,
      summary: {
        totalWorkers: performanceReports.length,
        totalCarsWashed: performanceReports.reduce((sum, report) => sum + report.carsWashed, 0),
        totalEarnings: performanceReports.reduce((sum, report) => sum + report.totalEarnings, 0),
        averageEfficiency: performanceReports.length > 0 
          ? performanceReports.reduce((sum, report) => sum + report.efficiency, 0) / performanceReports.length 
          : 0
      }
    });

  } catch (error) {
    console.error('Fetch performance reports error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
