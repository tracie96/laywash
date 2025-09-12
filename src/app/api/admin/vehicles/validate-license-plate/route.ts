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
    const licensePlate = searchParams.get('licensePlate');

    if (!licensePlate || !licensePlate.trim()) {
      return NextResponse.json(
        { success: true, isUnique: true },
        { status: 200 }
      );
    }

    // Check if license plate already exists
    const { data: existingVehicle, error } = await supabaseAdmin
      .from('vehicles')
      .select('id, license_plate')
      .eq('license_plate', licensePlate.trim().toUpperCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      return NextResponse.json(
        { success: false, error: 'Error checking license plate availability' },
        { status: 500 }
      );
    }

    const isUnique = !existingVehicle;

    return NextResponse.json({
      success: true,
      isUnique,
      message: isUnique ? 'License plate is available' : 'License plate is already registered'
    });

  } catch (error) {
    console.error('License plate validation error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
