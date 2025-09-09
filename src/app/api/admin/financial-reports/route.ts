import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Types for the response data
interface CheckInData {
  id: string;
  company_income: number;
  payment_status: string;
  check_in_time: string;
  customer_id: string;
  assigned_admin_id: string;
}

interface SaleData {
  id: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  customer_id: string;
  admin_id: string;
}

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
    const location = searchParams.get('location'); // Optional location filter

    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - parseInt(period));

    // Get admin IDs for the selected location if location filter is provided
    let adminIdsForLocation: string[] = [];
    if (location) {
      const { data: locationData, error: locationError } = await supabaseAdmin
        .from('locations')
        .select('id')
        .eq('id', location)
        .single();
      
      if (locationError || !locationData) {
        return NextResponse.json(
          { success: false, error: 'Location not found' },
          { status: 404 }
        );
      }

      // Get all admin IDs that belong to this location
      const { data: adminProfiles, error: adminProfilesError } = await supabaseAdmin
        .from('admin_profiles')
        .select('user_id')
        .eq('location', location);
      
      if (adminProfilesError) {
        console.error('Error fetching admin profiles:', adminProfilesError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch admin profiles' },
          { status: 500 }
        );
      }
      
      adminIdsForLocation = adminProfiles?.map(profile => profile.user_id) || [];
    }

    // Fetch data from multiple sources concurrently
    const [
      checkInsResponse,
      salesResponse,
      carWasherProfilesResponse,
      bonusesResponse,
      paymentRequestsResponse,
      expensesResponse
    ] = await Promise.all([
      // Car wash check-ins
      supabaseAdmin
        .from('car_check_ins')
        .select(`
          id,
          company_income,
          payment_status,
          check_in_time,
          customer_id,
          assigned_admin_id,
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
          admin_id,
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
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('payment_request')
        .select(`
          id,
          washer_id,
          amount,
          status,
          created_at,
          total_earnings,
          material_deductions,
          tool_deductions
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString())
        .order('created_at', { ascending: false }),

      // Expenses from the new expenses table
      supabaseAdmin
        .from('expenses')
        .select(`
          id,
          service_type,
          amount,
          reason,
          description,
          expense_date,
          location_id
        `)
        .gte('expense_date', startDate.toISOString())
        .lte('expense_date', now.toISOString())
        .order('expense_date', { ascending: false })
    ]);

    // Check for errors
    if (checkInsResponse.error || salesResponse.error || carWasherProfilesResponse.error || bonusesResponse.error || paymentRequestsResponse.error || expensesResponse.error) {
      console.error('Error fetching financial data:', {
        checkIns: checkInsResponse.error,
        sales: salesResponse.error,
        carWasherProfiles: carWasherProfilesResponse.error,
        bonuses: bonusesResponse.error,
        paymentRequests: paymentRequestsResponse.error,
        expenses: expensesResponse.error
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch financial data' },
        { status: 500 }
      );
    }

    // Filter data by location if specified
    let filteredCheckIns = (checkInsResponse.data || []) as CheckInData[];
    let filteredSales = (salesResponse.data || []) as SaleData[];

    if (location && adminIdsForLocation.length > 0) {
      // Filter check-ins by admin IDs that belong to the selected location
      filteredCheckIns = filteredCheckIns.filter(checkIn => {
        return adminIdsForLocation.includes(checkIn.assigned_admin_id);
      });

      // Filter sales by admin IDs that belong to the selected location
      filteredSales = filteredSales.filter(sale => {
        return adminIdsForLocation.includes(sale.admin_id);
      });
    } else if (location && adminIdsForLocation.length === 0) {
      // If location is selected but no admins found for that location, return empty results
      filteredCheckIns = [];
      filteredSales = [];
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
      totalExpenses: number;
      
      // Worker Wages
      totalWages: number;
      pendingWages: number;
      
      // Metrics
      customerCount: number;
      transactionCount: number;
      carWashCount: number;
      productSaleCount: number;
      washerCount: number;
    }>();

    // Process car wash check-ins
    filteredCheckIns.forEach(checkIn => {
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
          totalExpenses: 0,
          totalWages: 0,
          pendingWages: 0,
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
        monthData.carWashRevenue += checkIn.company_income || 0;
        monthData.totalRevenue += checkIn.company_income || 0;
      }
      
      monthData.transactionCount += 1;
      monthData.carWashCount += 1;
      
      // Count unique customers
      if (checkIn.customer_id) {
        monthData.customerCount += 1;
      }
    });

    // Process product sales
    filteredSales.forEach(sale => {
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
          totalExpenses: 0,
          totalWages: 0,
          pendingWages: 0,
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
          totalExpenses: 0,
          totalWages: 0,
          pendingWages: 0,
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
          totalExpenses: 0,
          totalWages: 0,
          pendingWages: 0,
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

    // Process payment requests for worker wages
    console.log('Payment requests data:', paymentRequestsResponse.data);
    paymentRequestsResponse.data?.forEach(paymentRequest => {
      console.log('Processing payment request:', {
        id: paymentRequest.id,
        status: paymentRequest.status,
        total_earnings: paymentRequest.total_earnings,
        amount: paymentRequest.amount,
        created_at: paymentRequest.created_at
      });
      
      const date = new Date(paymentRequest.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          carWashRevenue: 0,
          productSalesRevenue: 0,
          totalRevenue: 0,
          washerSalaries: 0,
          washerBonuses: 0,
          customerBonuses: 0,
          totalExpenses: 0,
          totalWages: 0,
          pendingWages: 0,
          customerCount: 0,
          transactionCount: 0,
          carWashCount: 0,
          productSaleCount: 0,
          washerCount: 0
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      
      const totalEarnings = parseFloat(paymentRequest.total_earnings || '0');
      const amountRequested = parseFloat(paymentRequest.amount || '0');
      monthData.totalWages += totalEarnings + amountRequested;
      
      if (paymentRequest.status === 'paid') {
        console.log('Adding to pending wages:', totalEarnings);
        monthData.pendingWages += totalEarnings;
      }
    });

    // Process expenses from the new expenses table
    expensesResponse.data?.forEach(expense => {
      const date = new Date(expense.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          carWashRevenue: 0,
          productSalesRevenue: 0,
          totalRevenue: 0,
          washerSalaries: 0,
          washerBonuses: 0,
          customerBonuses: 0,
          totalExpenses: 0,
          totalWages: 0,
          pendingWages: 0,
          customerCount: 0,
          transactionCount: 0,
          carWashCount: 0,
          productSaleCount: 0,
          washerCount: 0
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      const amount = parseFloat(expense.amount || '0');
      
      // Add to total expenses
      monthData.totalExpenses += amount;
      
      // Categorize expenses by service type
      switch (expense.service_type) {
        case 'checkin':
          // Free car wash - this is a revenue loss, not a direct expense
          // We could track this separately if needed
          break;
        case 'salary':
          monthData.washerSalaries += amount;
          break;
        case 'sales':
          // Free sales - revenue loss
          break;
        case 'free_will':
          // Voluntary expenses
          break;
        case 'deposit_to_bank':
          // Bank deposits
          break;
        case 'other':
          // Other expenses
          break;
      }
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
        
        // Worker Wages
        totalWages: data.totalWages,
        pendingWages: data.pendingWages,
        
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
