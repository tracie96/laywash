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
    // Fetch car washers from the users table with role = 'car_washer'
    const { data: washers, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        role,
        is_active,
        created_at,
        updated_at,
        car_washer_profiles (
          assigned_admin_id,
          hourly_rate,
          total_earnings,
          is_available
        )
      `)
      .eq('role', 'car_washer')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching washers:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch washers' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedWashers = washers.map(washer => ({
      id: washer.id,
      name: washer.name,
      email: washer.email,
      phone: washer.phone,
      joinDate: washer.created_at,
      status: getWasherStatus(washer.is_active, washer.car_washer_profiles?.is_available),
      totalCarsWashed: 0, // This would need to be calculated from car_check_ins table
      averageRating: 4.5, // This would need to be calculated from ratings table
      lastActive: 'N/A', // This would need to be tracked separately
      hourlyRate: washer.car_washer_profiles?.hourly_rate || 0,
      totalEarnings: washer.car_washer_profiles?.total_earnings || 0,
      isAvailable: washer.car_washer_profiles?.is_available || false,
      assignedAdminId: washer.car_washer_profiles?.assigned_admin_id || null
    }));

    return NextResponse.json({
      success: true,
      washers: transformedWashers
    });

  } catch (error) {
    console.error('Fetch washers error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to determine washer status
function getWasherStatus(isActive: boolean, isAvailable: boolean | null): 'active' | 'inactive' | 'on_leave' {
  if (!isActive) return 'inactive';
  if (isAvailable === false) return 'on_leave';
  return 'active';
}
