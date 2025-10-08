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
    const { totalRevenue } = await request.json();

    // Validate the revenue amount
    if (totalRevenue === undefined || typeof totalRevenue !== 'number' || totalRevenue < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid revenue amount. Must be a positive number.' },
        { status: 400 }
      );
    }

    // Update the total_earnings in car_washer_profiles
    const { error: updateError } = await supabaseAdmin
      .from('car_washer_profiles')
      .update({ total_earnings: totalRevenue })
      .eq('user_id', id);

    if (updateError) {
      console.error('Error updating worker revenue:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update worker revenue' },
        { status: 500 }
      );
    }

    // Fetch the updated profile to confirm
    const { data: updatedProfile, error: fetchError } = await supabaseAdmin
      .from('car_washer_profiles')
      .select('total_earnings')
      .eq('user_id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated profile:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch updated profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Revenue updated successfully',
      totalEarnings: updatedProfile.total_earnings
    });

  } catch (error) {
    console.error('Update revenue error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

