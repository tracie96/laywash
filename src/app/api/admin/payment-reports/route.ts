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
    // Get current admin user from request header (optional for super admins)
    const currentAdminId = request.headers.get('X-Admin-ID');
    
    let isSuperAdmin = false;
    let locationAdminIds: string[] | null = null;
    
    // If admin ID is provided, check if they're a super admin and get their location
    if (currentAdminId) {
      const { data: adminUser } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', currentAdminId)
        .single();
      
      isSuperAdmin = adminUser?.role === 'super_admin';
      
      // Get admin's location if not super admin
      if (!isSuperAdmin) {
        const { data: adminProfile } = await supabaseAdmin
          .from('admin_profiles')
          .select('location')
          .eq('user_id', currentAdminId)
          .single();
        
        const adminLocation = adminProfile?.location || null;
        
        // Get all admins at the same location
        if (adminLocation) {
          const { data: locationAdmins } = await supabaseAdmin
            .from('admin_profiles')
            .select('user_id')
            .eq('location', adminLocation);
          
          locationAdminIds = locationAdmins?.map(a => a.user_id) || [];
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('reportType') || 'daily'; // daily, weekly, monthly
    const period = searchParams.get('period') || 'week'; // today, yesterday, week, month, quarter, custom
    const viewMode = searchParams.get('viewMode') || 'all'; // all, car-wash-only, stock-sales-only
    const customStartDate = searchParams.get('startDate'); // Custom start date
    const customEndDate = searchParams.get('endDate'); // Custom end date
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    
    if (period === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
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
          startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
          endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
          break;
        case 'month':
          startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
          endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        default:
          startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      }
    }

    // Fetch car check-ins data for the specified period (only if not stock-sales-only)
    let checkIns: Array<{
      id: string;
      company_income: number;
      payment_status: string;
      payment_method: string;
      check_in_time: string;
      actual_completion_time: string | null;
      updated_at: string;
      customer_id: string;
    }> = [];
    
    if (viewMode !== 'stock-sales-only') {
      let checkInsQuery = supabaseAdmin
        .from('car_check_ins')
        .select(`
          id,
          company_income,
          payment_status,
          payment_method,
          check_in_time,
          actual_completion_time,
          updated_at,
          customer_id
        `);
      
      // For car wash revenue reporting, always use updated_at (when payment was recorded)
      // This ensures we capture payments made during the period, not just service completions
      if (viewMode === 'car-wash-only') {
        // Use updated_at for filtering as it reflects when payment was actually recorded
        // Also ensure we only get paid transactions
        checkInsQuery = checkInsQuery
          .eq('payment_status', 'paid')
          .gte('updated_at', startDate.toISOString())
          .lte('updated_at', endDate.toISOString())
          .order('updated_at', { ascending: false });
      } else {
        // For "all sales" mode, also use updated_at for car wash payments
        // Filter by updated_at to get payments recorded in the period
        checkInsQuery = checkInsQuery
          .gte('updated_at', startDate.toISOString())
          .lte('updated_at', endDate.toISOString())
          .order('updated_at', { ascending: false });
      }
      
      // Filter by location (through assigned_admin_id)
      if (locationAdminIds && locationAdminIds.length > 0) {
        checkInsQuery = checkInsQuery.in('assigned_admin_id', locationAdminIds);
      }

      const { data: checkInsData, error: checkInsError } = await checkInsQuery;

      if (checkInsError) {
        console.error('Error fetching check-ins for payment reports:', checkInsError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch car wash payment data' },
          { status: 500 }
        );
      }
      
      checkIns = checkInsData || [];
    }

    // Fetch stock sales data if requested (only if not car-wash-only)
    let stockSales: Array<{
      id: string;
      total_amount: number;
      payment_method: string;
      created_at: string;
      inventory_id?: string;
      inventory_name?: string;
      quantity_sold?: number;
      inventory?: {
        id: string;
        name: string;
        category: string;
        unit: string;
      };
    }> = [];
    
    if (viewMode !== 'car-wash-only') {
      // Fetch actual stock sales from sales_transactions table
      let salesQuery = supabaseAdmin
        .from('sales_transactions')
        .select(`
          id,
          total_amount,
          payment_method,
          status,
          created_at,
          inventory_id,
          inventory_name,
          quantity_sold,
          inventory (
            id,
            name,
            category,
            unit
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'completed') // Only completed sales
        .order('created_at', { ascending: false });
      
      // Filter by location (through admin_id)
      if (locationAdminIds && locationAdminIds.length > 0) {
        salesQuery = salesQuery.in('admin_id', locationAdminIds);
      }

      const { data: salesTransactions, error: salesError } = await salesQuery;

      if (salesError) {
        console.error('Error fetching sales transactions for stock sales:', salesError);
      } else if (salesTransactions) {
        stockSales = salesTransactions.map(transaction => ({
          id: transaction.id,
          total_amount: transaction.total_amount,
          payment_method: transaction.payment_method,
          created_at: transaction.created_at,
          inventory_id: transaction.inventory_id,
          inventory_name: transaction.inventory_name,
          quantity_sold: transaction.quantity_sold,
          inventory: Array.isArray(transaction.inventory) ? transaction.inventory[0] : transaction.inventory
        }));
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

    // Process car check-ins (only if not stock-sales-only)
    if (viewMode !== 'stock-sales-only') {
      checkIns?.forEach(checkIn => {
      // For car wash revenue, always use updated_at (when payment was recorded) for accurate reporting
      // For paid transactions, use updated_at; for pending, fall back to check_in_time
      const dateTime = (checkIn.payment_status === 'paid' && checkIn.updated_at) 
        ? checkIn.updated_at 
        : checkIn.check_in_time;
      const date = new Date(dateTime);
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
    }

    // Process stock sales (only if not car-wash-only)
    if (viewMode !== 'car-wash-only' && stockSales.length > 0) {
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
      detailedTransactions: stockSales, // Include detailed transaction data with inventory info
      summary: {
        reportType,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalReports: reports.length,
        viewMode,
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
