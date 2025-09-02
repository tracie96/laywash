import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET() {
  try {
    // Get current date and calculate period boundaries
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Fetch income metrics from car_check_ins
    const { data: incomeData, error: incomeError } = await supabaseAdmin
      .from('car_check_ins')
      .select('total_amount, check_in_time, payment_status')
      .eq('payment_status', 'paid')
      .gte('check_in_time', monthStart.toISOString());

    if (incomeError) {
      console.error('Error fetching income data:', incomeError);
      throw new Error('Failed to fetch income data');
    }

    // 1.1. Fetch stock sales income from sales_transactions
    const { data: stockSalesData, error: stockSalesError } = await supabaseAdmin
      .from('sales_transactions')
      .select('total_amount, created_at, status')
      .eq('status', 'completed')
      .gte('created_at', monthStart.toISOString());

    if (stockSalesError) {
      console.error('Error fetching stock sales data:', stockSalesError);
      // Continue without stock sales data rather than failing completely
    }

    // Calculate combined income metrics (car wash + stock sales)
    const calculateIncome = (data: Array<{ total_amount: number; [key: string]: string | number }>, dateField: string, startDate: Date) => {
      return data
        ?.filter(item => new Date(item[dateField]) >= startDate)
        .reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;
    };

    // Car wash income
    const dailyCarWashIncome = calculateIncome(incomeData, 'check_in_time', today);
    const weeklyCarWashIncome = calculateIncome(incomeData, 'check_in_time', weekStart);
    const monthlyCarWashIncome = calculateIncome(incomeData, 'check_in_time', monthStart);

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

    // 4. Fetch pending check-ins count
    const { data: pendingCheckIns, error: pendingError } = await supabaseAdmin
      .from('car_check_ins')
      .select('id')
      .in('status', ['pending', 'in_progress']);

    if (pendingError) {
      console.error('Error fetching pending check-ins:', pendingError);
      throw new Error('Failed to fetch pending check-ins');
    }

    const pendingCheckInsCount = pendingCheckIns?.length || 0;

    // 5. Fetch low stock items count
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
    
    const { data: performanceData, error: performanceError } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        assigned_washer_id,
        total_amount,
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
      performance.totalEarnings += checkIn.total_amount || 0;
    });

    // Get top 5 performers
    const topPerformingWashers = Array.from(washerPerformance.values())
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 5);

    // 7. Fetch recent activities
    const { data: recentCheckIns, error: recentError } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        status,
        total_amount,
        check_in_time,
        vehicle_model,
        customers (
          name
        )
      `)
      .order('check_in_time', { ascending: false })
      .limit(10);

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
          description = `Payment completed: $${checkIn.total_amount || 0} for ${vehicleModel}`;
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
