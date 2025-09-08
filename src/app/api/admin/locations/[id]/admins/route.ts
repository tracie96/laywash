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
    console.log('Fetching admins for location id:', id);
    
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

    // First, get admin profiles assigned to this location
    const { data: adminProfiles, error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .select('user_id')
      .eq('location', id);

    if (profileError) {
      console.error('Error fetching admin profiles:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch admin profiles' },
        { status: 500 }
      );
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    const adminIds = adminProfiles.map(profile => profile.user_id);

    // Fetch admins assigned to this location
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        is_active
      `)
      .eq('role', 'admin')
      .eq('is_active', true)
      .in('id', adminIds);

    if (adminsError) {
      console.error('Error fetching admins:', adminsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch admins' },
        { status: 500 }
      );
    }

    // Transform admin data to match frontend expectations
    const transformedAdmins = admins?.map(admin => {
      // Split the full name into first and last name
      const nameParts = admin.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      return {
        id: admin.id,
        first_name: firstName,
        last_name: lastName,
        email: admin.email,
        phone: admin.phone || undefined,
        is_active: admin.is_active
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: transformedAdmins
    });

  } catch (error) {
    console.error('Error fetching admins by location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admins by location' },
      { status: 500 }
    );
  }
}
