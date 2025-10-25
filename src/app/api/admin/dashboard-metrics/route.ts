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

    // Get current date in Nigeria time (UTC+1) - more robust approach
    const now = new Date();
    let today: Date;
    
    try {
      // Try to use Intl.DateTimeFormat for better timezone handling
      const nigeriaTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Lagos',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(now);
      
      // Extract date components
      const year = parseInt(nigeriaTime.find(part => part.type === 'year')?.value || '0');
      const month = parseInt(nigeriaTime.find(part => part.type === 'month')?.value || '0') - 1; // 0-indexed
      const day = parseInt(nigeriaTime.find(part => part.type === 'day')?.value || '0');
      
      // Create today's date in Nigeria timezone
      today = new Date(year, month, day);
    } catch (error) {
      console.warn('Timezone API not available, falling back to manual calculation:', error);
      // Fallback to manual UTC+1 calculation
      const nigeriaNow = new Date(now.getTime() + (1 * 60 * 60 * 1000)); // UTC+1
      today = new Date(nigeriaNow.getFullYear(), nigeriaNow.getMonth(), nigeriaNow.getDate());
    }
    
    // Additional fallback: Use environment variable or default to UTC+1
    if (!today || isNaN(today.getTime())) {
      console.warn('Date calculation failed, using server time with UTC+1 offset');
      const serverTime = new Date();
      const nigeriaTime = new Date(serverTime.getTime() + (1 * 60 * 60 * 1000));
      today = new Date(nigeriaTime.getFullYear(), nigeriaTime.getMonth(), nigeriaTime.getDate());
    }
    
    // Calculate date ranges
    const startOfDay = new Date(today);
    const endOfDay = new Date(today.getTime() + (24 * 60 * 60 * 1000) - 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek.getTime() + (7 * 24 * 60 * 60 * 1000) - 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Debug logging for timezone issues
    console.log('Timezone debug:', {
      serverTime: now.toISOString(),
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      today: today.toISOString(),
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      environment: process.env.NODE_ENV,
      timestamp: Date.now()
    });

    // 1. Calculate income metrics for car wash services
    let dailyIncome = 0;
    let weeklyIncome = 0;
    let monthlyIncome = 0;
    let dailyCarWashIncome = 0;
    let weeklyCarWashIncome = 0;
    let monthlyCarWashIncome = 0;
    let dailyCarCount = 0;
    let weeklyCarCount = 0;
    let monthlyCarCount = 0;

    // Fetch car check-ins for income calculations (include all statuses for earnings)
    let checkInsQuery = supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        company_income,
        payment_status,
        check_in_time,
        status
      `)
      .gte('check_in_time', startOfDay.toISOString())
      .lte('check_in_time', endOfDay.toISOString());
    
    // Filter by location (through assigned_admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      checkInsQuery = checkInsQuery.in('assigned_admin_id', locationAdminIds);
    }

    const { data: checkInsData, error: checkInsError } = await checkInsQuery;

    if (checkInsError) {
      console.error('Error fetching check-ins for income calculation:', checkInsError);
    } else if (checkInsData) {
      // Debug logging for earnings calculation
      console.log('Earnings debug - Today check-ins:', {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        checkInsCount: checkInsData.length,
        checkInsData: checkInsData.map(ci => ({
          id: ci.id,
          company_income: ci.company_income,
          payment_status: ci.payment_status,
          status: ci.status,
          check_in_time: ci.check_in_time
        }))
      });

      // Calculate daily income from ALL check-ins (including pending)
      const dailyCheckIns = checkInsData.filter(checkIn => {
        const checkInDate = new Date(checkIn.check_in_time);
        return checkInDate >= startOfDay && checkInDate <= endOfDay;
      });
      
      // Calculate total earnings (including pending payments)
      dailyIncome = dailyCheckIns.reduce((sum, checkIn) => sum + (checkIn.company_income || 0), 0);
      
      // Calculate only paid earnings for car wash income
      const paidCheckIns = dailyCheckIns.filter(ci => ci.payment_status === 'paid' && ci.status === 'completed');
      dailyCarWashIncome = paidCheckIns.reduce((sum, checkIn) => sum + (checkIn.company_income || 0), 0);
      
      dailyCarCount = dailyCheckIns.length;

      // Note: Weekly and monthly calculations will be done with separate queries below
    }

    // 2. Calculate stock sales income - Daily
    let dailyStockSalesIncome = 0;
    let weeklyStockSalesIncome = 0;
    let monthlyStockSalesIncome = 0;

    // Fetch daily stock sales data
    let dailySalesQuery = supabaseAdmin
      .from('sales_transactions')
      .select(`
        id,
        total_amount,
        created_at
      `)
      .eq('status', 'completed')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());
    
    if (locationAdminIds && locationAdminIds.length > 0) {
      dailySalesQuery = dailySalesQuery.in('admin_id', locationAdminIds);
    }

    const { data: dailySalesData, error: dailySalesError } = await dailySalesQuery;
    if (!dailySalesError && dailySalesData) {
      dailyStockSalesIncome = dailySalesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    }

    // Fetch weekly stock sales data
    let weeklySalesQuery = supabaseAdmin
      .from('sales_transactions')
      .select(`
        id,
        total_amount,
        created_at
      `)
      .eq('status', 'completed')
      .gte('created_at', startOfWeek.toISOString())
      .lte('created_at', endOfWeek.toISOString());
    
    if (locationAdminIds && locationAdminIds.length > 0) {
      weeklySalesQuery = weeklySalesQuery.in('admin_id', locationAdminIds);
    }

    const { data: weeklySalesData, error: weeklySalesError } = await weeklySalesQuery;
    if (!weeklySalesError && weeklySalesData) {
      weeklyStockSalesIncome = weeklySalesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    }

    // Fetch monthly stock sales data
    let monthlySalesQuery = supabaseAdmin
      .from('sales_transactions')
      .select(`
        id,
        total_amount,
        created_at
      `)
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());
    
    if (locationAdminIds && locationAdminIds.length > 0) {
      monthlySalesQuery = monthlySalesQuery.in('admin_id', locationAdminIds);
    }

    const { data: monthlySalesData, error: monthlySalesError } = await monthlySalesQuery;
    if (!monthlySalesError && monthlySalesData) {
      monthlyStockSalesIncome = monthlySalesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    }

    // Add stock sales to total income
    dailyIncome += dailyStockSalesIncome;
    weeklyIncome += weeklyStockSalesIncome;
    monthlyIncome += monthlyStockSalesIncome;

    // Fetch weekly check-ins data
    let weeklyCheckInsQuery = supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        company_income,
        payment_status,
        check_in_time,
        status
      `)
      .gte('check_in_time', startOfWeek.toISOString())
      .lte('check_in_time', endOfWeek.toISOString());
    
    if (locationAdminIds && locationAdminIds.length > 0) {
      weeklyCheckInsQuery = weeklyCheckInsQuery.in('assigned_admin_id', locationAdminIds);
    }

    const { data: weeklyCheckInsData, error: weeklyCheckInsError } = await weeklyCheckInsQuery;

    if (weeklyCheckInsError) {
      console.error('Error fetching weekly check-ins:', weeklyCheckInsError);
    } else if (weeklyCheckInsData) {
      // Calculate weekly income from ALL check-ins (including pending)
      weeklyIncome = weeklyCheckInsData.reduce((sum, checkIn) => sum + (checkIn.company_income || 0), 0);
      
      // Calculate only paid earnings for weekly car wash income
      const paidWeeklyCheckIns = weeklyCheckInsData.filter(ci => ci.payment_status === 'paid' && ci.status === 'completed');
      weeklyCarWashIncome = paidWeeklyCheckIns.reduce((sum, checkIn) => sum + (checkIn.company_income || 0), 0);
      
      weeklyCarCount = weeklyCheckInsData.length;
    }

    // Fetch monthly check-ins data
    let monthlyCheckInsQuery = supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        company_income,
        payment_status,
        check_in_time,
        status
      `)
      .gte('check_in_time', startOfMonth.toISOString())
      .lte('check_in_time', endOfMonth.toISOString());
    
    if (locationAdminIds && locationAdminIds.length > 0) {
      monthlyCheckInsQuery = monthlyCheckInsQuery.in('assigned_admin_id', locationAdminIds);
    }

    const { data: monthlyCheckInsData, error: monthlyCheckInsError } = await monthlyCheckInsQuery;

    if (monthlyCheckInsError) {
      console.error('Error fetching monthly check-ins:', monthlyCheckInsError);
    } else if (monthlyCheckInsData) {
      // Calculate monthly income from ALL check-ins (including pending)
      monthlyIncome = monthlyCheckInsData.reduce((sum, checkIn) => sum + (checkIn.company_income || 0), 0);
      
      // Calculate only paid earnings for monthly car wash income
      const paidMonthlyCheckIns = monthlyCheckInsData.filter(ci => ci.payment_status === 'paid' && ci.status === 'completed');
      monthlyCarWashIncome = paidMonthlyCheckIns.reduce((sum, checkIn) => sum + (checkIn.company_income || 0), 0);
      
      monthlyCarCount = monthlyCheckInsData.length;
    }
  

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
      .select('id, created_at')
      .in('status', ['pending', 'in_progress']);
    
    // Filter by location (through assigned_admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      pendingQuery = pendingQuery.in('assigned_admin_id', locationAdminIds);
    }

    const { data: pendingCheckIns, error: pendingError } = await pendingQuery;

    if (pendingError) {
      console.error('Error fetching pending check-ins:', pendingError);
      throw new Error('Failed to fetch pending check-ins');
    }

    // Filter pending check-ins for today using the same date logic
    const pendingCheckInsCount = pendingCheckIns?.filter(checkIn => {
      const checkInDate = new Date(checkIn.created_at);
      return checkInDate.toDateString() === today.toDateString();
    }).length || 0;

    // Calculate pending check-ins total amount for today
    let pendingAmountQuery = supabaseAdmin
      .from('car_check_ins')
      .select('company_income, total_amount, status, created_at')
      .in('status', ['pending', 'in_progress']);
    
    // Filter by location (through assigned_admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      pendingAmountQuery = pendingAmountQuery.in('assigned_admin_id', locationAdminIds);
    }

    const { data: pendingCheckInsAmount, error: pendingAmountError } = await pendingAmountQuery;

    if (pendingAmountError) {
      console.error('Error fetching pending check-ins amount:', pendingAmountError);
    }

    const pendingPaymentAmount = pendingCheckInsAmount?.filter(checkIn => {
      const checkInDate = new Date(checkIn.created_at);
      return checkInDate.toDateString() === today.toDateString();
    }).reduce((sum, checkIn) => {
      const amount = checkIn.company_income || checkIn.total_amount || 0;
      return sum + amount;
    }, 0) || 0;

    // 5. Fetch low stock items
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
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
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

    // Debug logging for final metrics
    console.log('Final dashboard metrics:', {
      dailyIncome,
      dailyCarWashIncome,
      dailyStockSalesIncome,
      dailyCarCount,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });

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