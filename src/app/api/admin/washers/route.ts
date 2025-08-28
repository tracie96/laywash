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
        car_washer_profiles!car_washer_profiles_user_id_fkey (
          assigned_admin_id,
          address,
          total_earnings,
          is_available,
          assigned_location
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

    // Fetch assigned admin names
    const adminIds = washers
      ?.map(w => w.car_washer_profiles?.[0]?.assigned_admin_id)
      .filter(Boolean) || [];

    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', adminIds)
      .eq('role', 'admin');

    const adminMap = new Map(admins?.map(admin => [admin.id, admin.name]) || []);

    // Fetch check-in statistics for each washer
    const washerIds = washers?.map(w => w.id) || [];
    const { data: checkInStats } = await supabaseAdmin
      .from('car_check_ins')
      .select('assigned_washer_id, status, updated_at')
      .in('assigned_washer_id', washerIds);

    // Calculate stats for each washer
    const washerStats = new Map();
    checkInStats?.forEach(checkIn => {
      const washerId = checkIn.assigned_washer_id;
      if (!washerStats.has(washerId)) {
        washerStats.set(washerId, {
          totalCheckIns: 0,
          completedCheckIns: 0,
          lastActive: null
        });
      }
      
      const stats = washerStats.get(washerId);
      stats.totalCheckIns += 1;
      
      if (checkIn.status === 'completed') {
        stats.completedCheckIns += 1;
      }
      
      // Track most recent activity
      const updateTime = new Date(checkIn.updated_at);
      if (!stats.lastActive || updateTime > stats.lastActive) {
        stats.lastActive = updateTime;
      }
    });

    // Transform the data to match the frontend interface
    const transformedWashers = washers?.map(washer => {
      const profile = washer.car_washer_profiles?.[0];
      const stats = washerStats.get(washer.id) || { totalCheckIns: 0, completedCheckIns: 0, lastActive: null };
      const assignedAdminName = profile?.assigned_admin_id ? adminMap.get(profile.assigned_admin_id) || 'Unassigned' : 'Unassigned';
      return {
        id: washer.id,
        name: washer.name,
        email: washer.email,
        phone: washer.phone,
        address: profile?.address || "Not specified",
        totalEarnings: profile?.total_earnings || 0,
        isAvailable: profile?.is_available ?? true,
        assignedAdminId: profile?.assigned_admin_id || null,
        assignedAdminName,
        assigned_location: profile?.assigned_location || "Not specified",
        totalCheckIns: stats.totalCheckIns,
        completedCheckIns: stats.completedCheckIns,
        averageRating: 4.5, // TODO: Calculate from actual ratings
        createdAt: new Date(washer.created_at),
        lastActive: stats.lastActive || new Date(washer.updated_at)
      };
    }) || [];


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


