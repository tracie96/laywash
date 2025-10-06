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
    let adminLocation: string | null = null;
    
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
        
        adminLocation = adminProfile?.location || null;
      }
    }

    // Get all admins at the same location if filtering by location
    let locationAdminIds: string[] | null = null;
    if (adminLocation) {
      const { data: locationAdmins } = await supabaseAdmin
        .from('admin_profiles')
        .select('user_id')
        .eq('location', adminLocation);
      
      locationAdminIds = locationAdmins?.map(a => a.user_id) || [];
    }

    // Get current date and calculate period boundaries
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

 
    let incomeQuery = supabaseAdmin
      .from('car_check_ins')
      .select('company_income, check_in_time, payment_status')
      .eq('payment_status', 'paid')
      .gte('check_in_time', monthStart.toISOString().split('T')[0]);
    
    // Filter by location (through assigned_admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      incomeQuery = incomeQuery.in('assigned_admin_id', locationAdminIds);
    }

    const { data: incomeData, error: incomeError } = await incomeQuery;

    if (incomeError) {
      console.error('Error fetching income data:', incomeError);
      throw new Error('Failed to fetch income data');
    }

    let stockSalesQuery = supabaseAdmin
      .from('sales_transactions')
      .select('total_amount, created_at, status')
      .eq('status', 'completed')
      .gte('created_at', monthStart.toISOString().split('T')[0]);
    
    // Filter by location (through admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      stockSalesQuery = stockSalesQuery.in('admin_id', locationAdminIds);
    }

    const { data: stockSalesData, error: stockSalesError } = await stockSalesQuery;

    if (stockSalesError) {
      console.error('Error fetching stock sales data:', stockSalesError);
    }

    const calculateIncome = (data: Array<{ total_amount: number; [key: string]: string | number }>, dateField: string, startDate: Date) => {
      return data
        ?.filter(item => new Date(item[dateField]) >= startDate)
        .reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;
    };

    const calculateCarWashIncome = (data: Array<{ company_income: number | null; [key: string]: string | number | null }>, dateField: string, startDate: Date) => {
      return data
        ?.filter(item => item[dateField] && new Date(item[dateField] as string) >= startDate)
        .reduce((sum, item) => sum + (item.company_income || 0), 0) || 0;
    };


    const dailyCarWashIncome = calculateCarWashIncome(incomeData, 'check_in_time', today);
    const weeklyCarWashIncome = calculateCarWashIncome(incomeData, 'check_in_time', weekStart);
    const monthlyCarWashIncome = calculateCarWashIncome(incomeData, 'check_in_time', monthStart);

    // Stock sales income
    const dailyStockSalesIncome = calculateIncome(stockSalesData || [], 'created_at', today);
    const weeklyStockSalesIncome = calculateIncome(stockSalesData || [], 'created_at', weekStart);
    const monthlyStockSalesIncome = calculateIncome(stockSalesData || [], 'created_at', monthStart);

    // Combined total income
    const dailyIncome = dailyCarWashIncome + dailyStockSalesIncome;
    const weeklyIncome = weeklyCarWashIncome + weeklyStockSalesIncome;
    const monthlyIncome = monthlyCarWashIncome + monthlyStockSalesIncome;

    // 2. Calculate car count metrics
    const dailyCarCount = incomeData
      ?.filter(item => new Date(item.check_in_time) >= today).length || 0;

    const weeklyCarCount = incomeData
      ?.filter(item => new Date(item.check_in_time) >= weekStart).length || 0;

    const monthlyCarCount = incomeData?.length || 0;

    // 3. Fetch active washers count
    const { data: washersData, error: washersError } = await supabaseAdmin
      .from('users')
      .select(`
        id, 
        name, 
        email,
        car_washer_profiles!car_washer_profiles_user_id_fkey (
          is_available,
          total_earnings
        )
      `)
      .eq('role', 'car_washer')
      .eq('is_active', true);

    if (washersError) {
      console.error('Error fetching washers data:', washersError);
      throw new Error('Failed to fetch washers data');
    }

    const activeWashers = washersData?.filter(washer => 
      washer.car_washer_profiles?.[0]?.is_available
    ).length || 0;

    // 4. Fetch pending check-ins count for today
    let pendingQuery = supabaseAdmin
      .from('car_check_ins')
      .select('id')
      .in('status', ['pending', 'in_progress'])
      .gte('check_in_time', today.toISOString())
      .lt('check_in_time', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());
    
    // Filter by location (through assigned_admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      pendingQuery = pendingQuery.in('assigned_admin_id', locationAdminIds);
    }

    const { data: pendingCheckIns, error: pendingError } = await pendingQuery;

    if (pendingError) {
      console.error('Error fetching pending check-ins:', pendingError);
      throw new Error('Failed to fetch pending check-ins');
    }

    const pendingCheckInsCount = pendingCheckIns?.length || 0;

    // Calculate pending check-ins total amount for today
    let pendingAmountQuery = supabaseAdmin
      .from('car_check_ins')
      .select('company_income, total_amount, status')
      .in('status', ['pending', 'in_progress'])
      .gte('check_in_time', today.toISOString())
      .lt('check_in_time', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());
    
    // Filter by location (through assigned_admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      pendingAmountQuery = pendingAmountQuery.in('assigned_admin_id', locationAdminIds);
    }

    const { data: pendingCheckInsAmount, error: pendingAmountError } = await pendingAmountQuery;

    if (pendingAmountError) {
      console.error('Error fetching pending check-ins amount:', pendingAmountError);
    }


    const pendingPaymentAmount = pendingCheckInsAmount?.reduce((sum, checkIn) => {
      const amount = checkIn.company_income || checkIn.total_amount || 0;
      return sum + amount;
    }, 0) || 0;

    const { data: inventoryData, error: inventoryError } = await supabaseAdmin
      .from('stock_items')
      .select('id, current_stock, minimum_stock')
      .lt('current_stock', 'minimum_stock')
      .eq('is_active', true);

    if (inventoryError) {
      console.error('Error fetching inventory data:', inventoryError);
    }

    const lowStockItems = inventoryData?.length || 0;

    // 6. Fetch top performing washers (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    let performanceQuery = supabaseAdmin
      .from('car_check_ins')
      .select(`
        assigned_washer_id,
        company_income,
        assigned_washer:users!car_check_ins_assigned_washer_id_fkey (
          id,
          name,
          email,
          phone,
          car_washer_profiles!car_washer_profiles_user_id_fkey (
            total_earnings
          )
        )
      `)
      .eq('status', 'completed')
      .eq('payment_status', 'paid')
      .gte('check_in_time', thirtyDaysAgo.toISOString())
      .not('assigned_washer_id', 'is', null);
    
    // Filter by location (through assigned_admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      performanceQuery = performanceQuery.in('assigned_admin_id', locationAdminIds);
    }

    const { data: performanceData, error: performanceError } = await performanceQuery;

    if (performanceError) {
      console.error('Error fetching performance data:', performanceError);
      throw new Error('Failed to fetch performance data');
    }

    // Group by washer and calculate metrics
    const washerPerformance = new Map();
    performanceData?.forEach(checkIn => {
      const washerId = checkIn.assigned_washer_id;
      if (!washerId || !checkIn.assigned_washer) return;
      
      // Type assertion to handle the foreign key relationship correctly
      const assignedWasher = (checkIn.assigned_washer as unknown) as {
        id: string;
        name: string;
        email: string;
        phone: string;
        car_washer_profiles: { total_earnings: number }[];
      };
      
      if (!washerPerformance.has(washerId)) {
        washerPerformance.set(washerId, {
          washer: {
            id: assignedWasher.id,
            name: assignedWasher.name,
            email: assignedWasher.email,
            phone: assignedWasher.phone,
            role: 'car_washer',
            isActive: true,
            totalEarnings: assignedWasher.car_washer_profiles?.[0]?.total_earnings || 0,
            isAvailable: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          carsWashed: 0,
          totalEarnings: 0,
        });
      }

      const performance = washerPerformance.get(washerId);
      performance.carsWashed += 1;
      performance.totalEarnings += checkIn.company_income || 0;
    });

    // Get top 5 performers
    const topPerformingWashers = Array.from(washerPerformance.values())
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 5);

    // 7. Fetch recent activities
    let recentQuery = supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        status,
        company_income,
        check_in_time,
        vehicle_model,
        customers (
          name
        )
      `)
      .order('check_in_time', { ascending: false })
      .limit(10);
    
    // Filter by location (through assigned_admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      recentQuery = recentQuery.in('assigned_admin_id', locationAdminIds);
    }

    const { data: recentCheckIns, error: recentError } = await recentQuery;

    if (recentError) {
      console.error('Error fetching recent activities:', recentError);
      throw new Error('Failed to fetch recent activities');
    }

    // Format recent activities
    const recentActivities = recentCheckIns?.slice(0, 5).map(checkIn => {
      const customerName = checkIn.customers?.[0]?.name || 'Unknown Customer';
              const vehicleModel = checkIn.vehicle_model || 'Vehicle';
      
      let description = '';
      let type = '';

      switch (checkIn.status) {
        case 'pending':
          description = `New car check-in: ${vehicleModel} (${customerName})`;
          type = 'check_in';
          break;
        case 'completed':
          description = `Payment completed: $${checkIn.company_income || 0} for ${vehicleModel}`;
          type = 'payment';
          break;
        case 'in_progress':
          description = `Service in progress: ${vehicleModel} (${customerName})`;
          type = 'service';
          break;
        default:
          description = `Activity: ${vehicleModel} (${customerName})`;
          type = 'activity';
      }

      return {
        type,
        description,
        timestamp: new Date(checkIn.check_in_time),
      };
    }) || [];

    // Add stock alerts to recent activities if any
    if (lowStockItems > 0) {
      recentActivities.unshift({
        type: 'stock',
        description: `Low stock alert: ${lowStockItems} item${lowStockItems > 1 ? 's' : ''} below minimum level`,
        timestamp: new Date(),
      });
    }

    // Limit to 5 most recent activities
    const limitedRecentActivities = recentActivities.slice(0, 5);

    // Prepare dashboard metrics response
    const dashboardMetrics = {
      totalIncome: {
        daily: dailyIncome,
        weekly: weeklyIncome,
        monthly: monthlyIncome,
      },
      carWashIncome: {
        daily: dailyCarWashIncome,
        weekly: weeklyCarWashIncome,
        monthly: monthlyCarWashIncome,
      },
      stockSalesIncome: {
        daily: dailyStockSalesIncome,
        weekly: weeklyStockSalesIncome,
        monthly: monthlyStockSalesIncome,
      },
      carCount: {
        daily: dailyCarCount,
        weekly: weeklyCarCount,
        monthly: monthlyCarCount,
      },
      activeWashers,
      pendingCheckIns: pendingCheckInsCount,
      pendingPayments: pendingPaymentAmount,
      lowStockItems,
      topPerformingWashers,
      recentActivities: limitedRecentActivities,
    };

    return NextResponse.json({
      success: true,
      data: dashboardMetrics,
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}
