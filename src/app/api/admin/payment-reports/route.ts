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
    const period = searchParams.get('period') || 'week'; // today, yesterday, week, month, quarter, custom
    const includeStockSales = searchParams.get('includeStockSales') !== 'false'; // Default to true
    const customStartDate = searchParams.get('startDate'); // Custom start date
    const customEndDate = searchParams.get('endDate'); // Custom end date
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    
    if (period === 'custom' && customStartDate && customEndDate) {
      // Use custom date range
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      // Set end date to end of day for better inclusivity
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Use predefined periods
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
    }

    // Fetch car check-ins data for the specified period
    const { data: checkIns, error: checkInsError } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        company_income,
        payment_status,
        payment_method,
        check_in_time,
        customer_id
      `)
      .gte('check_in_time', startDate.toISOString())
      .lte('check_in_time', endDate.toISOString())
      .order('check_in_time', { ascending: false });

    if (checkInsError) {
      console.error('Error fetching check-ins for payment reports:', checkInsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch car wash payment data' },
        { status: 500 }
      );
    }

    // Fetch stock sales data if requested
    let stockSales: Array<{
      id: string;
      total_amount: number;
      payment_method: string;
      created_at: string;
    }> = [];
    if (includeStockSales) {
      // Fetch actual stock sales from sales_transactions table
      const { data: salesTransactions, error: salesError } = await supabaseAdmin
        .from('sales_transactions')
        .select(`
          id,
          total_amount,
          payment_method,
          status,
          created_at
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'completed') // Only completed sales
        .order('created_at', { ascending: false });

      if (salesError) {
        console.error('Error fetching sales transactions for stock sales:', salesError);
        // Continue without stock sales data rather than failing completely
      } else if (salesTransactions) {
        stockSales = salesTransactions;
      }
    }

    // Group data based on report type
    const groupedData = new Map<string, {
      totalPayments: number;
      totalRevenue: number;
      carWashRevenue: number;
      stockSalesRevenue: number;
      cashPayments: number;
      cardPayments: number;
      mobilePayments: number;
      pendingPayments: number;
      pendingAmount: number;
      carWashCount: number;
      stockSalesCount: number;
      date: string;
    }>();

    // Process car check-ins
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
          carWashRevenue: 0,
          stockSalesRevenue: 0,
          cashPayments: 0,
          cardPayments: 0,
          mobilePayments: 0,
          pendingPayments: 0,
          pendingAmount: 0,
          carWashCount: 0,
          stockSalesCount: 0,
          date: groupKey
        });
      }

      const group = groupedData.get(groupKey)!;
      
      // Count total payments
      group.totalPayments += 1;
      group.carWashCount += 1;
      
      // Count by payment status
      if (checkIn.payment_status === 'paid') {
        const amount = checkIn.company_income || 0;
        group.totalRevenue += amount;
        group.carWashRevenue += amount;
        
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
        group.pendingAmount += checkIn.company_income || 0;
      }
    });

    // Process stock sales
    if (includeStockSales && stockSales.length > 0) {
      stockSales.forEach(sale => {
        const date = new Date(sale.created_at);
        let groupKey: string;

        switch (reportType) {
          case 'daily':
            groupKey = date.toISOString().split('T')[0];
            break;
          case 'weekly':
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
            carWashRevenue: 0,
            stockSalesRevenue: 0,
            cashPayments: 0,
            cardPayments: 0,
            mobilePayments: 0,
            pendingPayments: 0,
            pendingAmount: 0,
            carWashCount: 0,
            stockSalesCount: 0,
            date: groupKey
          });
        }

        const group = groupedData.get(groupKey)!;
        group.totalPayments += 1;
        group.stockSalesCount += 1;
        
        // Add stock sales revenue
        const amount = sale.total_amount || 0;
        group.totalRevenue += amount;
        group.stockSalesRevenue += amount;
        
        // Count by payment method for stock sales
        switch (sale.payment_method) {
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
      });
    }

    // Convert Map to Array and sort by date
    const reports = Array.from(groupedData.entries()).map(([key, data]) => ({
      date: key,
      totalPayments: data.totalPayments,
      totalRevenue: data.totalRevenue,
      carWashRevenue: data.carWashRevenue,
      stockSalesRevenue: data.stockSalesRevenue,
      cashPayments: data.cashPayments,
      cardPayments: data.cardPayments,
      mobilePayments: data.mobilePayments,
      pendingPayments: data.pendingPayments,
      pendingAmount: data.pendingAmount,
      carWashCount: data.carWashCount,
      stockSalesCount: data.stockSalesCount
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      reports,
      summary: {
        reportType,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalReports: reports.length,
        includeStockSales,
        totalCarWashRevenue: reports.reduce((sum, r) => sum + r.carWashRevenue, 0),
        totalStockSalesRevenue: reports.reduce((sum, r) => sum + r.stockSalesRevenue, 0),
        totalCombinedRevenue: reports.reduce((sum, r) => sum + r.totalRevenue, 0)
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
