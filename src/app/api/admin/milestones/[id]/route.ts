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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: milestone, error } = await supabaseAdmin
      .from('milestones')
      .select(`
        *,
        created_by_user:users!milestones_created_by_fkey (
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error || !milestone) {
      return NextResponse.json(
        { success: false, error: 'Milestone not found' },
        { status: 404 }
      );
    }

    // Transform the data
    const transformedMilestone = {
      id: milestone.id,
      name: milestone.name,
      description: milestone.description,
      type: milestone.type,
      condition: milestone.condition,
      reward: milestone.reward,
      isActive: milestone.is_active,
      createdBy: milestone.created_by,
      createdByName: milestone.created_by_user?.name || 'Unknown',
      createdAt: new Date(milestone.created_at),
      updatedAt: new Date(milestone.updated_at)
    };

    return NextResponse.json({
      success: true,
      milestone: transformedMilestone
    });

  } catch (error) {
    console.error('Get milestone error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData = await request.json();

    // Prepare update data
    const dbUpdateData: {
      name?: string;
      description?: string;
      type?: string;
      condition?: { operator: string; value: number };
      reward?: { type: string; value: number; description?: string };
      is_active?: boolean;
      updated_at?: string;
    } = {
      updated_at: new Date().toISOString()
    };

    if (updateData.name !== undefined) dbUpdateData.name = updateData.name.trim();
    if (updateData.description !== undefined) dbUpdateData.description = updateData.description.trim();
    if (updateData.type !== undefined) dbUpdateData.type = updateData.type;
    if (updateData.condition !== undefined) dbUpdateData.condition = updateData.condition;
    if (updateData.reward !== undefined) dbUpdateData.reward = updateData.reward;
    if (updateData.isActive !== undefined) dbUpdateData.is_active = updateData.isActive;

    // Validate condition if provided
    if (updateData.condition && (!updateData.condition.operator || updateData.condition.value === undefined)) {
      return NextResponse.json(
        { success: false, error: 'Invalid condition format' },
        { status: 400 }
      );
    }

    // Update the milestone
    const { data: milestone, error } = await supabaseAdmin
      .from('milestones')
      .update(dbUpdateData)
      .eq('id', id)
      .select(`
        *,
        created_by_user:users!milestones_created_by_fkey (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Error updating milestone:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update milestone' },
        { status: 500 }
      );
    }

    // Transform the data
    const transformedMilestone = {
      id: milestone.id,
      name: milestone.name,
      description: milestone.description,
      type: milestone.type,
      condition: milestone.condition,
      reward: milestone.reward,
      isActive: milestone.is_active,
      createdBy: milestone.created_by,
      createdByName: milestone.created_by_user?.name || 'Unknown',
      createdAt: new Date(milestone.created_at),
      updatedAt: new Date(milestone.updated_at)
    };

    return NextResponse.json({
      success: true,
      milestone: transformedMilestone
    });

  } catch (error) {
    console.error('Update milestone error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if milestone has any achievements
    const { data: achievements, error: achievementsError } = await supabaseAdmin
      .from('customer_milestone_achievements')
      .select('id')
      .eq('milestone_id', id)
      .limit(1);

    if (achievementsError) {
      console.error('Error checking achievements:', achievementsError);
      return NextResponse.json(
        { success: false, error: 'Failed to check milestone dependencies' },
        { status: 500 }
      );
    }

    if (achievements && achievements.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete milestone with existing achievements. Deactivate it instead.' },
        { status: 400 }
      );
    }

    // Delete the milestone
    const { error } = await supabaseAdmin
      .from('milestones')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting milestone:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete milestone' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Milestone deleted successfully'
    });

  } catch (error) {
    console.error('Delete milestone error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
