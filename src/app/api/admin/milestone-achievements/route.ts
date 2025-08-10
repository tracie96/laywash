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
    const customerId = searchParams.get('customerId');
    const milestoneId = searchParams.get('milestoneId');
    const rewardClaimed = searchParams.get('rewardClaimed');
    const sortBy = searchParams.get('sortBy') || 'achieved_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build the query
    let query = supabaseAdmin
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
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit);

    // Apply filters
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (milestoneId) {
      query = query.eq('milestone_id', milestoneId);
    }

    if (rewardClaimed !== null) {
      query = query.eq('reward_claimed', rewardClaimed === 'true');
    }

    const { data: achievements, error } = await query;

    if (error) {
      console.error('Error fetching milestone achievements:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch milestone achievements' },
        { status: 500 }
      );
    }

    // Transform the data
    const transformedAchievements = achievements?.map(achievement => ({
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
    })) || [];

    return NextResponse.json({
      success: true,
      achievements: transformedAchievements,
      total: transformedAchievements.length
    });

  } catch (error) {
    console.error('Fetch milestone achievements error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Function to check and create milestone achievements for a customer
export async function POST(request: NextRequest) {
  try {
    const { customerId, forceCheck } = await request.json();

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Get customer data
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get active milestones
    const { data: milestones, error: milestonesError } = await supabaseAdmin
      .from('milestones')
      .select('*')
      .eq('is_active', true);

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch milestones' },
        { status: 500 }
      );
    }

    // Get existing achievements for this customer
    const { data: existingAchievements, error: achievementsError } = await supabaseAdmin
      .from('customer_milestone_achievements')
      .select('milestone_id')
      .eq('customer_id', customerId);

    if (achievementsError) {
      console.error('Error fetching existing achievements:', achievementsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch existing achievements' },
        { status: 500 }
      );
    }

    const achievedMilestoneIds = new Set(existingAchievements?.map(a => a.milestone_id) || []);
    const newAchievements = [];

    // Check each milestone
    for (const milestone of milestones || []) {
      // Skip if already achieved (unless force checking)
      if (!forceCheck && achievedMilestoneIds.has(milestone.id)) {
        continue;
      }

      let qualified = false;
      let achievedValue = 0;

      // Check milestone condition
      if (milestone.type === 'visits') {
        achievedValue = customer.total_visits || 0;
        qualified = checkCondition(achievedValue, milestone.condition);
      } else if (milestone.type === 'spending') {
        achievedValue = parseFloat(customer.total_spent || '0');
        qualified = checkCondition(achievedValue, milestone.condition);
      }

      // If qualified and not already achieved, create achievement
      if (qualified && !achievedMilestoneIds.has(milestone.id)) {
        const { data: achievement, error: createError } = await supabaseAdmin
          .from('customer_milestone_achievements')
          .insert({
            customer_id: customerId,
            milestone_id: milestone.id,
            achieved_at: new Date().toISOString(),
            achieved_value: achievedValue,
            reward_claimed: false
          })
          .select('*')
          .single();

        if (!createError && achievement) {
          newAchievements.push(achievement);
        }
      }
    }

    return NextResponse.json({
      success: true,
      newAchievements: newAchievements.length,
      message: `${newAchievements.length} new milestone${newAchievements.length === 1 ? '' : 's'} achieved`
    });

  } catch (error) {
    console.error('Check milestone achievements error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to check milestone condition
function checkCondition(value: number, condition: { operator: string; value: number }): boolean {
  const { operator, value: targetValue } = condition;
  
  switch (operator) {
    case '>=':
      return value >= targetValue;
    case '<=':
      return value <= targetValue;
    case '=':
      return value === targetValue;
    case '>':
      return value > targetValue;
    case '<':
      return value < targetValue;
    default:
      return false;
  }
}
