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

    // Fetch worker's total earnings directly from car_washer_profiles
    const { data: profile, error } = await supabaseAdmin
      .from('car_washer_profiles')
      .select('total_earnings')
      .eq('user_id', workerId)
      .single();

    if (error) {
      console.error('Error fetching worker earnings:', error);
      return NextResponse.json(
        { success: false, error: 'Worker profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      totalEarnings: profile?.total_earnings || 0
    });

  } catch (error) {
    console.error('Worker earnings API error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
