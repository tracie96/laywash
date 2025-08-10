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
        totalVisits: achievement.customer?.total_visits,
        totalSpent: parseFloat(achievement.customer?.total_spent || '0')
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
        totalVisits: achievement.customer?.total_visits,
        totalSpent: parseFloat(achievement.customer?.total_spent || '0')
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
