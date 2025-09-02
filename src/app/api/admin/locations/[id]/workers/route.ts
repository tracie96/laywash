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
    console.log('id', id);
    // First, verify the location exists
    const { data: location, error: locationError } = await supabaseAdmin
      .from('locations')
      .select('id, address, lga')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (locationError || !location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('car_washer_profiles')
      .select('user_id')
      .eq('assigned_location', id);

      console.log('profileData', profileData);
    if (profileError) {
      console.error('Error fetching worker profiles:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch worker profiles' },
        { status: 500 }
      );
    }

    if (!profileData || profileData.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    const workerIds = profileData.map(profile => profile.user_id);

    // Fetch workers assigned to this location
    const { data: workers, error: workersError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        is_active
      `)
      .eq('role', 'car_washer')
      .eq('is_active', true)
      .in('id', workerIds);

    if (workersError) {
      console.error('Error fetching workers:', workersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch workers' },
        { status: 500 }
      );
    }



    // Transform worker data to match frontend expectations
    const transformedWorkers = workers?.map(worker => {
      // Split the full name into first and last name
      const nameParts = worker.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      return {
        id: worker.id,
        first_name: firstName,
        last_name: lastName,
        email: worker.email,
        phone: worker.phone || undefined,
        is_active: worker.is_active
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: transformedWorkers
    });

  } catch (error) {
    console.error('Error fetching workers by location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workers by location' },
      { status: 500 }
    );
  }
}
