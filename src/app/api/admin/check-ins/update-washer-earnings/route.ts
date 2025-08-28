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

export async function POST(request: NextRequest) {
  try {
    const { checkInId, washerId } = await request.json();

    if (!checkInId || !washerId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: checkInId and washerId' },
        { status: 400 }
      );
    }

    // Get the check-in with services and their commission percentages
    const { data: checkInData, error: checkInError } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        check_in_services (
          service_id,
          price,
          services (
            id,
            washer_commission_percentage
          )
        )
      `)
      .eq('id', checkInId)
      .single();

    if (checkInError) {
      console.error('Error fetching check-in data:', checkInError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch check-in data' },
        { status: 500 }
      );
    }

    if (!checkInData?.check_in_services || checkInData.check_in_services.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No check-in services found' },
        { status: 404 }
      );
    }

    console.log('Check-in data structure:', JSON.stringify(checkInData, null, 2));

    if (checkInError) {
      console.error('Error fetching check-in data:', checkInError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch check-in data' },
        { status: 500 }
      );
    }

    // Calculate total earnings for the washer
    let totalEarnings = 0;
    
    for (const checkInService of checkInData.check_in_services) {
      const service = checkInService.services?.[0]; 
      if (service && service.washer_commission_percentage && checkInService.price) {
        const commission = (checkInService.price * service.washer_commission_percentage) / 100;
        totalEarnings += commission;
        console.log(`Service: ${service.id}, Price: ${checkInService.price}, Commission: ${service.washer_commission_percentage}%, Earnings: ${commission}`);
      }
    }

    if (totalEarnings === 0) {
      console.warn('No earnings calculated for washer:', washerId);
      return NextResponse.json(
        { success: false, error: 'No earnings calculated' },
        { status: 400 }
      );
    }

    // First, get the current total earnings
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('car_washer_profiles')
      .select('total_earnings')
      .eq('user_id', washerId)
      .single();

    if (fetchError) {
      console.error('Error fetching current washer profile:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch washer profile' },
        { status: 500 }
      );
    }

    // Calculate new total earnings
    const currentEarnings = currentProfile?.total_earnings || 0;
    const newTotalEarnings = currentEarnings + totalEarnings;

    // Update the washer's total earnings in car_washer_profile
    const { error: updateError } = await supabaseAdmin
      .from('car_washer_profiles')
      .update({
        total_earnings: newTotalEarnings,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', washerId);

    if (updateError) {
      console.error('Error updating washer earnings:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update washer earnings' },
        { status: 500 }
      );
    }

    console.log(`Updated washer ${washerId} earnings by ${totalEarnings}`);

    return NextResponse.json({
      success: true,
      message: 'Washer earnings updated successfully',
      earningsAdded: totalEarnings
    });

  } catch (error) {
    console.error('Update washer earnings error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
