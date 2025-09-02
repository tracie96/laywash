import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from '../../../../lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client on server-side only
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, assignedLocation, nextOfKin,bankInformation, pictureUrl, createdBy } = await request.json();

    // Validate input
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, email, phone, and password are required' },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate next of kin (optional)
    if (nextOfKin && Array.isArray(nextOfKin) && nextOfKin.length > 0) {
      for (const kin of nextOfKin) {
        if (!kin.name || !kin.phone || !kin.address) {
          return NextResponse.json(
            { success: false, error: 'Each next of kin must have name, phone, and address' },
            { status: 400 }
          );
        }
      }
    }

    // Create the user in Supabase Auth using the provided password
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Create user profile in our users table
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: data.user.id,
        name,
        email,
        phone,
        role: 'car_washer',
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      // If profile creation fails, clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json(
        { success: false, error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Create car washer profile
    const { error: washerProfileError } = await supabaseAdmin
      .from('car_washer_profiles')
      .insert({
        user_id: data.user.id,
        assigned_admin_id: createdBy,
        assigned_location: assignedLocation,
        bank_information: bankInformation,
        total_earnings: 0,
        is_available: true,
        picture_url: pictureUrl || null,
        next_of_kin: nextOfKin || [],
      });

    if (washerProfileError) {
      console.error('Failed to create washer profile:', washerProfileError);
      // Don't fail the entire operation for this
    }

    // Send email to washer with login credentials
    await EmailService.sendTemporaryPassword(email, name, password, 'car_washer');

    return NextResponse.json({
      success: true,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        role: userProfile.role,
        isActive: userProfile.is_active,
      }
    });

  } catch (error) {
    console.error('Create car washer error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 