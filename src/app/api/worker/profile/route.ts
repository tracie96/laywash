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
    const workerId = searchParams.get('workerId');

    if (!workerId) {
      return NextResponse.json(
        { success: false, error: 'Worker ID required' },
        { status: 400 }
      );
    }

    // Fetch worker details
    const { data: worker, error: workerError } = await supabaseAdmin
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
          total_earnings,
          is_available,
          assigned_location,
          address,
          next_of_kin,
          picture_url
        )
      `)
      .eq('id', workerId)
      .eq('role', 'car_washer')
      .single();

    if (workerError) {  
      console.error('Error fetching worker:', workerError);
      return NextResponse.json(
        { success: false, error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Fetch assigned admin name
    const profile = worker.car_washer_profiles?.[0];
    let assignedAdminName = 'Unassigned';
    
    if (profile?.assigned_admin_id) {
      const { data: admin } = await supabaseAdmin
        .from('users')
        .select('name')
        .eq('id', profile.assigned_admin_id)
        .eq('role', 'admin')
        .single();
      
      if (admin) {
        assignedAdminName = admin.name;
      }
    }

    // Fetch worker's check-in statistics
    const { data: allCheckIns, error: checkInsError } = await supabaseAdmin
      .from('car_check_ins')
      .select('id, status, check_in_time, actual_completion_time, total_amount')
      .eq('assigned_washer_id', workerId);

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
    }

    const totalAllCheckIns = allCheckIns?.length || 0;
    const actualCompletedCount = allCheckIns?.filter(c => c.status === 'completed').length || 0;
    const totalEarnings = allCheckIns?.filter(c => c.status === 'completed').reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;

    // Calculate average rating (placeholder for now)
    const averageRating = 4.5;

    // Transform worker data
    const transformedWorker = {
      id: worker.id,
      name: worker.name,
      email: worker.email,
      phone: worker.phone,
      totalEarnings: totalEarnings,
      isAvailable: profile?.is_available ?? true,
      assignedAdminId: profile?.assigned_admin_id || null,
      assignedAdminName,
      totalCheckIns: totalAllCheckIns,
      completedCheckIns: actualCompletedCount,
      averageRating,
      createdAt: new Date(worker.created_at),
      lastActive: new Date(worker.updated_at),
      assignedLocation: profile?.assigned_location || "Not specified",
      address: profile?.address || 'Address not provided',
      emergencyContact: profile?.next_of_kin?.[0]?.name || 'Not provided',
      emergencyPhone: profile?.next_of_kin?.[0]?.phone || 'Not provided',
      skills: ['Car Washing', 'Customer Service'],
      certifications: [],
      notes: 'No additional notes.',
      pictureUrl: profile?.picture_url || null
    };

    return NextResponse.json({
      success: true,
      worker: transformedWorker
    });

  } catch (error) {
    console.error('Worker profile API error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
