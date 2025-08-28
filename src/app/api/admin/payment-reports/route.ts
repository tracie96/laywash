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
    const reportType = searchParams.get('reportType') || 'daily'; // daily, weekly, monthly
    const period = searchParams.get('period') || 'week'; // today, yesterday, week, month, quarter
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case 'week':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      default:
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    }

    // Fetch check-ins data for the specified period
    const { data: checkIns, error } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        total_amount,
        payment_status,
        payment_method,
        check_in_time,
        customer_id
      `)
      .gte('check_in_time', startDate.toISOString())
      .lte('check_in_time', endDate.toISOString())
      .order('check_in_time', { ascending: false });

    if (error) {
      console.error('Error fetching check-ins for payment reports:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payment report data' },
        { status: 500 }
      );
    }

    // Group data based on report type
    const groupedData = new Map<string, {
      totalPayments: number;
      totalRevenue: number;
      cashPayments: number;
      cardPayments: number;
      mobilePayments: number;
      pendingPayments: number;
      pendingAmount: number;
      date: string;
    }>();

    checkIns?.forEach(checkIn => {
      const date = new Date(checkIn.check_in_time);
      let groupKey: string;

      switch (reportType) {
        case 'daily':
          groupKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'weekly':
          // Get Monday of the week
          const monday = new Date(date);
          monday.setDate(date.getDate() - date.getDay() + 1);
          groupKey = monday.toISOString().split('T')[0];
          break;
        case 'monthly':
          groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          groupKey = date.toISOString().split('T')[0];
      }

      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          totalPayments: 0,
          totalRevenue: 0,
          cashPayments: 0,
          cardPayments: 0,
          mobilePayments: 0,
          pendingPayments: 0,
          pendingAmount: 0,
          date: groupKey
        });
      }

      const group = groupedData.get(groupKey)!;
      
      // Count total payments
      group.totalPayments += 1;
      
      // Count by payment status
      if (checkIn.payment_status === 'paid') {
        group.totalRevenue += checkIn.total_amount || 0;
        
        // Count by payment method
        switch (checkIn.payment_method) {
          case 'cash':
            group.cashPayments += 1;
            break;
          case 'pos':
            group.cardPayments += 1;
            break;
          case 'mobile_money':
            group.mobilePayments += 1;
            break;
        }
      } else {
        group.pendingPayments += 1;
        group.pendingAmount += checkIn.total_amount || 0;
      }
    });

    // Convert Map to Array and sort by date
    const reports = Array.from(groupedData.entries()).map(([key, data]) => ({
      date: key,
      totalPayments: data.totalPayments,
      totalRevenue: data.totalRevenue,
      cashPayments: data.cashPayments,
      cardPayments: data.cardPayments,
      mobilePayments: data.mobilePayments,
      pendingPayments: data.pendingPayments,
      pendingAmount: data.pendingAmount
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      reports,
      summary: {
        reportType,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalReports: reports.length
      }
    });

  } catch (error) {
    console.error('Payment reports error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
