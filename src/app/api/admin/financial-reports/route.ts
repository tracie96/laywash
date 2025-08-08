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
    const period = searchParams.get('period') || '6'; // Default to last 6 months

    // Get the current date and calculate the start date based on period
    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - parseInt(period));

    // Fetch check-ins data for the specified period
    const { data: checkIns, error } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        total_amount,
        payment_status,
        check_in_time,
        customer_id,
        customers (
          id,
          name
        )
      `)
      .gte('check_in_time', startDate.toISOString())
      .lte('check_in_time', now.toISOString())
      .order('check_in_time', { ascending: false });

    if (error) {
      console.error('Error fetching check-ins:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch financial data' },
        { status: 500 }
      );
    }

    // Group data by month and calculate financial metrics
    const monthlyData = new Map<string, {
      totalRevenue: number;
      totalExpenses: number;
      customerCount: number;
      transactionCount: number;
      totalAmount: number;
    }>();

    checkIns?.forEach(checkIn => {
      const date = new Date(checkIn.check_in_time);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          totalRevenue: 0,
          totalExpenses: 0,
          customerCount: 0,
          transactionCount: 0,
          totalAmount: 0
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      
      // Only count completed payments as revenue
      if (checkIn.payment_status === 'paid') {
        monthData.totalRevenue += checkIn.total_amount || 0;
      }
      
      monthData.totalAmount += checkIn.total_amount || 0;
      monthData.transactionCount += 1;
      
      // Count unique customers
      if (checkIn.customer_id) {
        monthData.customerCount += 1;
      }
    });

    // Calculate expenses (estimated as 30% of revenue for demo purposes)
    // In a real application, you would track actual expenses
    monthlyData.forEach((data, monthKey) => {
      data.totalExpenses = data.totalRevenue * 0.3; // 30% of revenue as expenses
    });

    // Transform data into the expected format
    const reports = Array.from(monthlyData.entries()).map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      
      return {
        id: monthKey,
        period: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        totalRevenue: data.totalRevenue,
        totalExpenses: data.totalExpenses,
        netProfit: data.totalRevenue - data.totalExpenses,
        customerCount: data.customerCount,
        averageTransaction: data.transactionCount > 0 ? data.totalAmount / data.transactionCount : 0,
        date: date.toISOString().split('T')[0]
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      reports
    });

  } catch (error) {
    console.error('Fetch financial reports error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
