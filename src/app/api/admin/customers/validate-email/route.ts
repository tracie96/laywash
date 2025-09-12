import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client on server-side only
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: true, isUnique: true },
        { status: 200 }
      );
    }

    // Check if email already exists
    const { data: existingCustomer, error } = await supabaseAdmin
      .from('customers')
      .select('id, email')
      .eq('email', email.trim())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      return NextResponse.json(
        { success: false, error: 'Error checking email availability' },
        { status: 500 }
      );
    }

    const isUnique = !existingCustomer;

    return NextResponse.json({
      success: true,
      isUnique,
      message: isUnique ? 'Email is available' : 'Email is already registered'
    });

  } catch (error) {
    console.error('Email validation error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
