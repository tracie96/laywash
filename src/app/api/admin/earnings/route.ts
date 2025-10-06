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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build the query to calculate total earnings from paid check-ins
    let query = supabaseAdmin
      .from('car_check_ins')
      .select('company_income,total_amount, payment_status, check_in_time')
      .eq('payment_status', 'paid');

    // Filter by location (through assigned_admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      query = query.in('assigned_admin_id', locationAdminIds);
    }

    // Apply date filters if provided
    if (startDate) {
      const startDateTime = new Date(startDate + 'T00:00:00');
      query = query.gte('check_in_time', startDateTime.toISOString());
    }
    if (endDate) {
      const endDateTime = new Date(endDate + 'T23:59:59');
      query = query.lte('check_in_time', endDateTime.toISOString());
    }

    const { data: checkIns, error } = await query;

    if (error) {
      console.error('Error fetching earnings data:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch earnings data' },
        { status: 500 }
      );
    }

    // Calculate total amount (company income + washer income)
    const totalAmount = checkIns?.reduce((total, checkIn) => {
      return total + (checkIn.total_amount || 0);
    }, 0) || 0;

    // Calculate company income
    const companyIncome = checkIns?.reduce((total, checkIn) => {
      return total + (checkIn.company_income || 0);
    }, 0) || 0;

    // Get additional statistics
    const totalPaidCheckIns = checkIns?.length || 0;
    
    // Calculate average earnings per check-in
    const averageEarnings = totalPaidCheckIns > 0 ? companyIncome / totalPaidCheckIns : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalAmount,
        companyIncome,
        totalPaidCheckIns,
        averageEarnings: Math.round(averageEarnings * 100) / 100, // Round to 2 decimal places
        dateRange: {
          startDate,
          endDate
        }
      }
    });

  } catch (error) {
    console.error('Error in earnings API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
