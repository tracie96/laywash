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

    // Get current date in Nigeria time - Vercel-specific approach
    const now = new Date();
    
    // Vercel servers run in UTC, so we need to be explicit about Nigeria time
    // Nigeria is UTC+1, so we add 1 hour to UTC time
    const nigeriaTime = new Date(now.getTime() + (1 * 60 * 60 * 1000));
    const today = new Date(nigeriaTime.getFullYear(), nigeriaTime.getMonth(), nigeriaTime.getDate());
    
    // For Vercel, let's also try a broader approach - include yesterday and today
    const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));
    const tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));
    
    // Calculate date ranges
    const startOfDay = new Date(today);
    const endOfDay = new Date(today.getTime() + (24 * 60 * 60 * 1000) - 1);
    
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek.getTime() + (7 * 24 * 60 * 60 * 1000) - 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

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
    // Use broader date range for Vercel to catch timezone edge cases
    // Filter by actual_completion_time to track today's earnings based on completion date
    let checkInsQuery = supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        company_income,
        payment_status,
        check_in_time,
        status,
        actual_completion_time,
        assigned_admin_id
      `)
      .gte('actual_completion_time', yesterday.toISOString())
      .lte('actual_completion_time', tomorrow.toISOString())
      .not('actual_completion_time', 'is', null);
    
    // Filter by location (through assigned_admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      checkInsQuery = checkInsQuery.in('assigned_admin_id', locationAdminIds);
    }

    const result = await checkInsQuery;
    let checkInsData = result.data;
    const checkInsError = result.error;

    if (checkInsError) {
      console.error('Error fetching check-ins for income calculation:', checkInsError);
    } else {
      console.log('Daily check-ins query result:', {
        count: checkInsData?.length || 0,
        data: checkInsData?.map(ci => ({
          id: ci.id,
          check_in_time: ci.check_in_time,
          actual_completion_time: ci.actual_completion_time,
          company_income: ci.company_income,
          payment_status: ci.payment_status
        })) || []
      });
    }

    // If no daily data found, try alternative date calculation
    if (!checkInsData || checkInsData.length === 0) {
      console.log('No daily check-ins found with UTC+1, trying alternative calculation...');
      
      // Try with server-based calculation
      const altStartOfDay = new Date(today);
      const altEndOfDay = new Date(today.getTime() + (24 * 60 * 60 * 1000) - 1);
      
      console.log('Trying alternative date range:', {
        altStartOfDay: altStartOfDay.toISOString(),
        altEndOfDay: altEndOfDay.toISOString()
      });
      
      // Try query with alternative dates using actual_completion_time
      let altQuery = supabaseAdmin
        .from('car_check_ins')
        .select(`
          id,
          company_income,
          payment_status,
          actual_completion_time,
          check_in_time,
          status,
          assigned_admin_id
        `)
        .gte('actual_completion_time', altStartOfDay.toISOString())
        .lte('actual_completion_time', altEndOfDay.toISOString())
        .not('actual_completion_time', 'is', null);
      
      if (locationAdminIds && locationAdminIds.length > 0) {
        altQuery = altQuery.in('assigned_admin_id', locationAdminIds);
      }
      
      const { data: altData } = await altQuery;
      console.log('Alternative query result:', {
        count: altData?.length || 0,
        data: altData?.map(ci => ({
          id: ci.id,
          check_in_time: ci.check_in_time,
          company_income: ci.company_income,
          payment_status: ci.payment_status
        })) || []
      });
      
      // If alternative method found data, use it
      if (altData && altData.length > 0) {
        console.log('Using alternative date calculation');
        // Update the variables to use alternative data
        checkInsData = altData;
      } else {
        // Check recent data as fallback
        console.log('Still no data, checking recent check-ins...');
        const recentQuery = supabaseAdmin
          .from('car_check_ins')
          .select('id, check_in_time, company_income, payment_status')
          .order('check_in_time', { ascending: false })
          .limit(5);
        
        if (locationAdminIds && locationAdminIds.length > 0) {
          recentQuery.in('assigned_admin_id', locationAdminIds);
        }
        
        const { data: recentData } = await recentQuery;
        console.log('Recent check-ins (last 5):', recentData?.map(ci => ({
          id: ci.id,
          check_in_time: ci.check_in_time,
          company_income: ci.company_income,
          payment_status: ci.payment_status,
          dateOnly: ci.check_in_time?.split('T')[0]
        })) || []);
      }
    }

    if (checkInsData) {
      // Calculate daily income from check-ins completed today
      // Filter for today's data from the broader range using actual_completion_time
      const dailyCheckIns = checkInsData.filter(checkIn => {
        if (!checkIn.actual_completion_time) return false;
        const completionDate = new Date(checkIn.actual_completion_time);
        const completionDateOnly = new Date(completionDate.getFullYear(), completionDate.getMonth(), completionDate.getDate());
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return completionDateOnly.getTime() === todayDateOnly.getTime();
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