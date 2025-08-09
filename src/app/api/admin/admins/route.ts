import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET() {
  try {
    // Fetch admins from the users table with role = 'admin'
    const { data: admins, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        role,
        is_active,
        created_at,
        updated_at,
        admin_profiles (
          location,
          address,
          cv_url,
          picture_url,
          next_of_kin
        )
      `)
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admins:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch admins' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedAdmins = admins.map(admin => {
      const profile = admin.admin_profiles?.[0];
      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        joinDate: admin.created_at,
        status: admin.is_active ? 'active' : 'inactive',
        lastLogin: 'N/A', // This would need to be tracked separately
        permissions: getPermissionsForRole(admin.role),
        location: profile?.location || null,
        address: profile?.address || null,
        cvUrl: profile?.cv_url || null,
        pictureUrl: profile?.picture_url || null,
        nextOfKin: profile?.next_of_kin || []
      };
    });

    return NextResponse.json({
      success: true,
      admins: transformedAdmins
    });

  } catch (error) {
    console.error('Fetch admins error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to determine permissions based on role
function getPermissionsForRole(role: string): string[] {
  switch (role) {
    case 'super_admin':
      return [
        'manage_workers',
        'view_reports',
        'manage_customers',
        'manage_admins',
        'manage_services',
        'financial_access',
        'system_settings'
      ];
    case 'admin':
      return [
        'manage_workers',
        'view_reports',
        'manage_customers',
        'manage_services'
      ];
    default:
      return ['view_reports'];
  }
}
