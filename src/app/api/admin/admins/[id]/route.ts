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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adminId } = await params;
    const body = await request.json();
    
    const { name, phone, location, address, status } = body;

    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    // Update user data in users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({
        name,
        phone,
        is_active: status === 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', adminId)
      .eq('role', 'admin'); // Ensure we're only updating admins

    if (userError) {
      console.error('Error updating user:', userError);
      return NextResponse.json(
        { success: false, error: 'Failed to update admin user data' },
        { status: 500 }
      );
    }

    // Check if admin profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('id')
      .eq('user_id', adminId)
      .single();

    let profileError = null;

    if (existingProfile) {
      // Update existing profile
      const { error } = await supabaseAdmin
        .from('admin_profiles')
        .update({
          location: location || null,
          address: address || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', adminId);
      profileError = error;
    } else {
      // Create new profile
      const { error } = await supabaseAdmin
        .from('admin_profiles')
        .insert({
          user_id: adminId,
          location: location || null,
          address: address || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      profileError = error;
    }

    if (profileError) {
      console.error('Error updating admin profile:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to update admin profile data' },
        { status: 500 }
      );
    }

    // Fetch the updated admin data to return
    const { data: updatedAdmin, error: fetchError } = await supabaseAdmin
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
      .eq('id', adminId)
      .eq('role', 'admin')
      .single();

    if (fetchError) {
      console.error('Error fetching updated admin:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Admin updated but failed to fetch updated data' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const profile = updatedAdmin.admin_profiles?.[0];
    const transformedAdmin = {
      id: updatedAdmin.id,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      phone: updatedAdmin.phone,
      joinDate: updatedAdmin.created_at,
      status: updatedAdmin.is_active ? 'active' : 'inactive',
      lastLogin: 'N/A', // This would need to be tracked separately
      permissions: getPermissionsForRole(updatedAdmin.role),
      location: profile?.location || null,
      address: profile?.address || null,
      cvUrl: profile?.cv_url || null,
      pictureUrl: profile?.picture_url || null,
      nextOfKin: profile?.next_of_kin || []
    };

    return NextResponse.json({
      success: true,
      admin: transformedAdmin,
      message: 'Admin updated successfully'
    });

  } catch (error) {
    console.error('Update admin error:', error);
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
    const { id: adminId } = await params;

    // Fetch specific admin data
    const { data: admin, error } = await supabaseAdmin
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
          locations (
            lga,
            address
          ),
          address,
          cv_url,
          picture_url,
          next_of_kin
        )
      `)
      .eq('id', adminId)
      .eq('role', 'admin')
      .single();

    if (error) {
      console.error('Error fetching admin:', error);
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the frontend interface
    const profile = admin.admin_profiles?.[0];
    // @ts-ignore
    const locationName = profile?.locations?.lga || profile?.locations?.address;
    
    const transformedAdmin = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      joinDate: admin.created_at,
      status: admin.is_active ? 'active' : 'inactive',
      lastLogin: 'N/A', // This would need to be tracked separately
      permissions: getPermissionsForRole(admin.role),
      location: profile?.location || null,
      locationName: locationName || null,
      address: profile?.address || null,
      cvUrl: profile?.cv_url || null,
      pictureUrl: profile?.picture_url || null,
      nextOfKin: profile?.next_of_kin || []
    };

    return NextResponse.json({
      success: true,
      admin: transformedAdmin
    });

  } catch (error) {
    console.error('Fetch admin error:', error);
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
