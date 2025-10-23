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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { claimedBy, notes } = await request.json();

    if (!claimedBy) {
      return NextResponse.json(
        { success: false, error: 'Claimed by admin ID is required' },
        { status: 400 }
      );
    }

    // Update the achievement to mark reward as claimed
    const { data: achievement, error } = await supabaseAdmin
      .from('customer_milestone_achievements')
      .update({
        reward_claimed: true,
        claimed_at: new Date().toISOString(),
        claimed_by: claimedBy,
        notes: notes || null
      })
      .eq('id', id)
      .select(`
        *,
        customer:customers!customer_milestone_achievements_customer_id_fkey (
          id,
          name,
          email,
          phone,
          license_plate,
          total_visits,
          total_spent
        ),
        milestone:milestones!customer_milestone_achievements_milestone_id_fkey (
          id,
          name,
          description,
          type,
          condition,
          reward,
          is_active
        ),
        claimed_by_user:users!customer_milestone_achievements_claimed_by_fkey (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Error claiming milestone reward:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to claim milestone reward' },
        { status: 500 }
      );
    }

    // Calculate actual visits from check-ins
    const { data: checkIns } = await supabaseAdmin
      .from('car_check_ins')
      .select('check_in_time, total_amount, status, payment_status')
      .eq('customer_id', achievement.customer_id);

    // Count unique days for total visits (same logic as customers route)
    const uniqueDays = new Set<string>();
    checkIns?.forEach(ci => {
      // Only count paid check-ins for total visits (same as customers route)
      if (ci.check_in_time && ci.payment_status === 'paid') {
        // Extract date without timezone conversion (same as customers route)
        const checkInDate = ci.check_in_time.split('T')[0];
        uniqueDays.add(checkInDate);
      }
    });
    const actualVisits = uniqueDays.size;
    
    // Calculate total spent from completed check-ins (same logic as customers route)
    const actualSpent = checkIns?.filter(ci => ci.status === 'completed' && ci.total_amount).reduce((sum, ci) => sum + (ci.total_amount || 0), 0) || 0;

    // Transform the data
    const transformedAchievement = {
      id: achievement.id,
      customerId: achievement.customer_id,
      customer: {
        id: achievement.customer?.id,
        name: achievement.customer?.name,
        email: achievement.customer?.email,
        phone: achievement.customer?.phone,
        licensePlate: achievement.customer?.license_plate,
        totalVisits: actualVisits,
        totalSpent: actualSpent
      },
      milestoneId: achievement.milestone_id,
      milestone: {
        id: achievement.milestone?.id,
        name: achievement.milestone?.name,
        description: achievement.milestone?.description,
        type: achievement.milestone?.type,
        condition: achievement.milestone?.condition,
        reward: achievement.milestone?.reward,
        isActive: achievement.milestone?.is_active
      },
      achievedAt: new Date(achievement.achieved_at),
      achievedValue: achievement.achieved_value,
      rewardClaimed: achievement.reward_claimed,
      claimedAt: achievement.claimed_at ? new Date(achievement.claimed_at) : undefined,
      claimedBy: achievement.claimed_by,
      claimedByName: achievement.claimed_by_user?.name,
      notes: achievement.notes
    };

    return NextResponse.json({
      success: true,
      achievement: transformedAchievement,
      message: 'Milestone reward claimed successfully'
    });

  } catch (error) {
    console.error('Claim milestone reward error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: achievement, error } = await supabaseAdmin
      .from('customer_milestone_achievements')
      .select(`
        *,
        customer:customers!customer_milestone_achievements_customer_id_fkey (
          id,
          name,
          email,
          phone,
          license_plate,
          total_visits,
          total_spent
        ),
        milestone:milestones!customer_milestone_achievements_milestone_id_fkey (
          id,
          name,
          description,
          type,
          condition,
          reward,
          is_active
        ),
        claimed_by_user:users!customer_milestone_achievements_claimed_by_fkey (
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error || !achievement) {
      return NextResponse.json(
        { success: false, error: 'Milestone achievement not found' },
        { status: 404 }
      );
    }

    // Calculate actual visits from check-ins
    const { data: checkIns } = await supabaseAdmin
      .from('car_check_ins')
      .select('check_in_time, total_amount, status, payment_status')
      .eq('customer_id', achievement.customer_id);

    // Count unique days for total visits (same logic as customers route)
    const uniqueDays = new Set<string>();
    checkIns?.forEach(ci => {
      // Only count paid check-ins for total visits (same as customers route)
      if (ci.check_in_time && ci.payment_status === 'paid') {
        // Extract date without timezone conversion (same as customers route)
        const checkInDate = ci.check_in_time.split('T')[0];
        uniqueDays.add(checkInDate);
      }
    });
    const actualVisits = uniqueDays.size;
    
    // Calculate total spent from completed check-ins (same logic as customers route)
    const actualSpent = checkIns?.filter(ci => ci.status === 'completed' && ci.total_amount).reduce((sum, ci) => sum + (ci.total_amount || 0), 0) || 0;

    // Transform the data
    const transformedAchievement = {
      id: achievement.id,
      customerId: achievement.customer_id,
      customer: {
        id: achievement.customer?.id,
        name: achievement.customer?.name,
        email: achievement.customer?.email,
        phone: achievement.customer?.phone,
        licensePlate: achievement.customer?.license_plate,
        totalVisits: actualVisits,
        totalSpent: actualSpent
      },
      milestoneId: achievement.milestone_id,
      milestone: {
        id: achievement.milestone?.id,
        name: achievement.milestone?.name,
        description: achievement.milestone?.description,
        type: achievement.milestone?.type,
        condition: achievement.milestone?.condition,
        reward: achievement.milestone?.reward,
        isActive: achievement.milestone?.is_active
      },
      achievedAt: new Date(achievement.achieved_at),
      achievedValue: achievement.achieved_value,
      rewardClaimed: achievement.reward_claimed,
      claimedAt: achievement.claimed_at ? new Date(achievement.claimed_at) : undefined,
      claimedBy: achievement.claimed_by,
      claimedByName: achievement.claimed_by_user?.name,
      notes: achievement.notes
    };

    return NextResponse.json({
      success: true,
      achievement: transformedAchievement
    });

  } catch (error) {
    console.error('Get milestone achievement error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
