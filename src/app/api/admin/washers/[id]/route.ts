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
    const updateData = await request.json();

    // Validate the update data
    if (updateData.is_active !== undefined && typeof updateData.is_active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'is_active must be a boolean value' },
        { status: 400 }
      );
    }



    // Prepare update data for users table
    const userUpdateData: { name?: string; email?: string; phone?: string; is_active?: boolean } = {};
    if (updateData.name !== undefined) userUpdateData.name = updateData.name;
    if (updateData.email !== undefined) userUpdateData.email = updateData.email;
    if (updateData.phone !== undefined) userUpdateData.phone = updateData.phone;
    if (updateData.is_active !== undefined) userUpdateData.is_active = updateData.is_active;

    // Prepare update data for car_washer_profiles table
    const profileUpdateData: { is_available?: boolean; assigned_admin_id?: string; assigned_location?: string } = {};
    if (updateData.isAvailable !== undefined) profileUpdateData.is_available = updateData.isAvailable;
    if (updateData.assignedAdminId !== undefined) profileUpdateData.assigned_admin_id = updateData.assignedAdminId;
    if (updateData.assigned_location !== undefined) profileUpdateData.assigned_location = updateData.assigned_location;

    // Update user data if there are changes
    if (Object.keys(userUpdateData).length > 0) {
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update(userUpdateData)
        .eq('id', id)
        .eq('role', 'car_washer');

      if (userError) {
        console.error('Error updating user:', userError);
        return NextResponse.json(
          { success: false, error: 'Failed to update washer information' },
          { status: 500 }
        );
      }
    }

    // Update profile data if there are changes
    if (Object.keys(profileUpdateData).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('car_washer_profiles')
        .update(profileUpdateData)
        .eq('user_id', id);

      if (profileError) {
        console.error('Error updating washer profile:', profileError);
        return NextResponse.json(
          { success: false, error: 'Failed to update washer profile' },
          { status: 500 }
        );
      }
    }

    // Fetch the updated washer data
    const { data: updatedWasher, error: fetchError } = await supabaseAdmin
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
        car_washer_profiles!car_washer_profiles_user_id_fkey (
          assigned_admin_id,
          total_earnings,
          assigned_location,
          is_available
        )
      `)
      .eq('id', id)
      .eq('role', 'car_washer')
      .single();

    if (fetchError) {
      console.error('Error fetching updated washer:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch updated washer data' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedWasher = {
      id: updatedWasher.id,
      name: updatedWasher.name,
      email: updatedWasher.email,
      phone: updatedWasher.phone,
      joinDate: updatedWasher.created_at,
      assigned_location: updatedWasher.car_washer_profiles?.[0]?.assigned_location || "Not specified",
      status: getWasherStatus(updatedWasher.is_active, updatedWasher.car_washer_profiles?.[0]?.is_available),
      totalCarsWashed: 0, // This would need to be calculated from car_check_ins table
      averageRating: 4.5, // This would need to be calculated from ratings table
      lastActive: 'N/A', // This would need to be tracked separately

      totalEarnings: updatedWasher.car_washer_profiles?.[0]?.total_earnings || 0,
      isAvailable: updatedWasher.car_washer_profiles?.[0]?.is_available || false,
      assignedAdminId: updatedWasher.car_washer_profiles?.[0]?.assigned_admin_id || null
    };

    return NextResponse.json({
      success: true,
      washer: transformedWasher
    });

  } catch (error) {
    console.error('Update washer error:', error);
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

    // Instead of deleting, we deactivate the washer
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .eq('role', 'car_washer');

    if (userError) {
      console.error('Error deactivating washer:', userError);
      return NextResponse.json(
        { success: false, error: 'Failed to deactivate washer' },
        { status: 500 }
      );
    }

    // Also mark as unavailable in the profile
    const { error: profileError } = await supabaseAdmin
      .from('car_washer_profiles')
      .update({ is_available: false })
      .eq('user_id', id);

    if (profileError) {
      console.error('Error updating washer profile availability:', profileError);
      // Don't fail the operation if profile update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Washer deactivated successfully'
    });

  } catch (error) {
    console.error('Delete washer error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to determine washer status
function getWasherStatus(isActive: boolean, isAvailable: boolean | null): 'active' | 'inactive' | 'on_leave' {
  if (!isActive) return 'inactive';
  if (isAvailable === false) return 'on_leave';
  return 'active';
}


