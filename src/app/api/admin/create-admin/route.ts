import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for signup (uses anon key)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for database operations (uses service key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, address, location, nextOfKin, cvUrl, pictureUrl } = await request.json();

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

    // Create the user in Supabase Auth using signup (this sends confirmation email)
    const { data, error } = await supabase.auth.signUp({
      email,
      password: password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`,
        data: {
          name: name,
          role: 'admin',
          phone: phone
        }
      }
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
        role: 'admin',
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

    // Create admin profile with new fields (if data provided)
    if (address || location || cvUrl || pictureUrl || (nextOfKin && nextOfKin.length > 0)) {
      const { error: adminProfileError } = await supabaseAdmin
        .from('admin_profiles')
        .insert({
          user_id: data.user.id,
          location: location || null,
          address: address || null,
          cv_url: cvUrl || null,
          picture_url: pictureUrl || null,
          next_of_kin: nextOfKin || null,
        });

      if (adminProfileError) {
        console.error('Failed to create admin profile:', adminProfileError);
        // Don't fail the entire operation for this
      }
    }

    // Admin account created successfully without email notification

    return NextResponse.json({
      success: true,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        // password not returned for security
        requiresEmailConfirmation: !data.session, // true if email confirmation is required
        role: userProfile.role,
        isActive: userProfile.is_active,
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 