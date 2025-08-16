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

    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - parseInt(period));

    // Fetch data from multiple sources concurrently
    const [
      checkInsResponse,
      salesResponse,
      carWasherProfilesResponse,
      bonusesResponse
    ] = await Promise.all([
      // Car wash check-ins
      supabaseAdmin
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
        .order('check_in_time', { ascending: false }),

      // Product sales transactions
      supabaseAdmin
        .from('sales_transactions')
        .select(`
          id,
          total_amount,
          payment_method,
          status,
          created_at,
          customer_id,
          customers (
            id,
            name
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString())
        .order('created_at', { ascending: false }),

      // Car washer profiles with earnings data
      supabaseAdmin
        .from('car_washer_profiles')
        .select(`
          id,
          total_earnings,
          created_at,
          user:users!car_washer_profiles_user_id_fkey (
            id,
            name,
            role
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString())
        .order('created_at', { ascending: false }),

      // Customer and washer bonuses
      supabaseAdmin
        .from('bonuses')
        .select(`
          id,
          type,
          amount,
          status,
          created_at,
          recipient_id
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString())
        .order('created_at', { ascending: false })
    ]);

    // Check for errors
    if (checkInsResponse.error || salesResponse.error || carWasherProfilesResponse.error || bonusesResponse.error) {
      console.error('Error fetching financial data:', {
        checkIns: checkInsResponse.error,
        sales: salesResponse.error,
        carWasherProfiles: carWasherProfilesResponse.error,
        bonuses: bonusesResponse.error
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch financial data' },
        { status: 500 }
      );
    }

    // Group data by month and calculate comprehensive financial metrics
    const monthlyData = new Map<string, {
      // Revenue
      carWashRevenue: number;
      productSalesRevenue: number;
      totalRevenue: number;
      
      // Expenses
      washerSalaries: number;
      washerBonuses: number;
      customerBonuses: number;
      adminSalaries: number;
      totalExpenses: number;
      
      // Metrics
      customerCount: number;
      transactionCount: number;
      carWashCount: number;
      productSaleCount: number;
      washerCount: number;
    }>();

    // Process car wash check-ins
    checkInsResponse.data?.forEach(checkIn => {
      const date = new Date(checkIn.check_in_time);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          carWashRevenue: 0,
          productSalesRevenue: 0,
          totalRevenue: 0,
          washerSalaries: 0,
          washerBonuses: 0,
          customerBonuses: 0,
          adminSalaries: 0,
          totalExpenses: 0,
          customerCount: 0,
          transactionCount: 0,
          carWashCount: 0,
          productSaleCount: 0,
          washerCount: 0
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      
      // Only count completed payments as revenue
      if (checkIn.payment_status === 'paid') {
        monthData.carWashRevenue += checkIn.total_amount || 0;
        monthData.totalRevenue += checkIn.total_amount || 0;
      }
      
      monthData.transactionCount += 1;
      monthData.carWashCount += 1;
      
      // Count unique customers
      if (checkIn.customer_id) {
        monthData.customerCount += 1;
      }
    });

    // Process product sales
    salesResponse.data?.forEach(sale => {
      const date = new Date(sale.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          carWashRevenue: 0,
          productSalesRevenue: 0,
          totalRevenue: 0,
          washerSalaries: 0,
          washerBonuses: 0,
          customerBonuses: 0,
          adminSalaries: 0,
          totalExpenses: 0,
          customerCount: 0,
          transactionCount: 0,
          carWashCount: 0,
          productSaleCount: 0,
          washerCount: 0
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      
      if (sale.status === 'completed') {
        monthData.productSalesRevenue += sale.total_amount || 0;
        monthData.totalRevenue += sale.total_amount || 0;
      }
      
      monthData.transactionCount += 1;
      monthData.productSaleCount += 1;
    });

    // Process car washer profiles for earnings data
    carWasherProfilesResponse.data?.forEach(profile => {
      const date = new Date(profile.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          carWashRevenue: 0,
          productSalesRevenue: 0,
          totalRevenue: 0,
          washerSalaries: 0,
          washerBonuses: 0,
          customerBonuses: 0,
          adminSalaries: 0,
          totalExpenses: 0,
          customerCount: 0,
          transactionCount: 0,
          carWashCount: 0,
          productSaleCount: 0,
          washerCount: 0
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      
      // Count total earnings as washer salaries (expenses)
      if (profile.total_earnings) {
        const amount = parseFloat(profile.total_earnings || '0');
        
        monthData.washerSalaries += amount;
        monthData.totalExpenses += amount;
      }
    });

    // Process bonuses
    bonusesResponse.data?.forEach(bonus => {
      const date = new Date(bonus.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          carWashRevenue: 0,
          productSalesRevenue: 0,
          totalRevenue: 0,
          washerSalaries: 0,
          washerBonuses: 0,
          customerBonuses: 0,
          adminSalaries: 0,
          totalExpenses: 0,
          customerCount: 0,
          transactionCount: 0,
          carWashCount: 0,
          productSaleCount: 0,
          washerCount: 0
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      
      // Only count approved/paid bonuses as expenses
      if (bonus.status === 'approved' || bonus.status === 'paid') {
        const amount = parseFloat(bonus.amount || '0');
        
        if (bonus.type === 'washer') {
          monthData.washerBonuses += amount;
          monthData.totalExpenses += amount;
        } else if (bonus.type === 'customer') {
          monthData.customerBonuses += amount;
          monthData.totalExpenses += amount;
        }
      }
    });

    // Estimate admin salaries (this would come from actual admin salary data in a real system)
    monthlyData.forEach((data) => {
      // Estimate admin salaries as 15% of revenue (this should be replaced with actual data)
      data.adminSalaries = data.totalRevenue * 0.15;
      data.totalExpenses += data.adminSalaries;
    });

    // Transform data into the expected format
    const reports = Array.from(monthlyData.entries()).map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      
      return {
        id: monthKey,
        period: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        date: date.toISOString().split('T')[0],
        
        // Revenue breakdown
        totalRevenue: data.totalRevenue,
        carWashRevenue: data.carWashRevenue,
        productSalesRevenue: data.productSalesRevenue,
        
        // Expense breakdown
        totalExpenses: data.totalExpenses,
        washerSalaries: data.washerSalaries,
        washerBonuses: data.washerBonuses,
        customerBonuses: data.customerBonuses,
        adminSalaries: data.adminSalaries,
        
        // Net profit
        netProfit: data.totalRevenue - data.totalExpenses,
        
        // Metrics
        customerCount: data.customerCount,
        transactionCount: data.transactionCount,
        carWashCount: data.carWashCount,
        productSaleCount: data.productSaleCount,
        averageTransaction: data.transactionCount > 0 ? data.totalRevenue / data.transactionCount : 0,
        
        // Profit margin
        profitMargin: data.totalRevenue > 0 ? ((data.totalRevenue - data.totalExpenses) / data.totalRevenue) * 100 : 0
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
