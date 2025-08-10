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
    const isActive = searchParams.get('isActive');
    const type = searchParams.get('type');

    // Build the query
    let query = supabaseAdmin
      .from('milestones')
      .select(`
        *,
        created_by_user:users!milestones_created_by_fkey (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: milestones, error } = await query;

    if (error) {
      console.error('Error fetching milestones:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch milestones' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedMilestones = milestones?.map(milestone => ({
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
    })) || [];

    return NextResponse.json({
      success: true,
      milestones: transformedMilestones
    });

  } catch (error) {
    console.error('Fetch milestones error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      type, 
      condition, 
      reward, 
      isActive = true, 
      createdBy 
    } = body;

    // Validate required fields
    if (!name || !description || !type || !condition || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate condition structure
    if (!condition.operator || condition.value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Invalid condition format' },
        { status: 400 }
      );
    }

    // Insert the milestone
    const { data: milestone, error } = await supabaseAdmin
      .from('milestones')
      .insert({
        name: name.trim(),
        description: description.trim(),
        type,
        condition,
        reward,
        is_active: isActive,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
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
      console.error('Error creating milestone:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create milestone' },
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
    console.error('Create milestone error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
