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

export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      email, 
      phone, 
      licensePlate, 
      vehicleType, 
      vehicleModel, 
      vehicleColor,
      dateOfBirth
    } = await request.json();

    // Validate required input
    if (!name || !phone || !licensePlate || !vehicleType || !vehicleColor) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, phone, license plate, vehicle type, and vehicle color are required' },
        { status: 400 }
      );
    }

    // Check if customer with same license plate already exists
    const { data: existingCustomer, error: checkError } = await supabaseAdmin
      .from('customers')
      .select('id, name')
      .eq('license_plate', licensePlate)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      return NextResponse.json(
        { success: false, error: 'Error checking for existing customer' },
        { status: 500 }
      );
    }

    if (existingCustomer) {
      return NextResponse.json(
        { success: false, error: `Customer with license plate ${licensePlate} already exists` },
        { status: 400 }
      );
    }
console.log('Creating customer',  dateOfBirth)
    // Create customer in the database
    const { data: customer, error: insertError } = await supabaseAdmin
      .from('customers')
      .insert({
        name,
        email: email || null,
        phone,
        license_plate: licensePlate,
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel || null,
        vehicle_color: vehicleColor,
        date_of_birth: dateOfBirth || null,
        is_registered: true,
        registration_date: new Date().toISOString(),
        total_visits: 0,
        total_spent: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Create customer error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create customer ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        licensePlate: customer.license_plate,
        vehicleType: customer.vehicle_type,
        vehicleModel: customer.vehicle_model,
        vehicleColor: customer.vehicle_color,
        dateOfBirth: customer.date_of_birth,
        isRegistered: customer.is_registered,
        registrationDate: customer.registration_date,
        totalVisits: customer.total_visits,
        totalSpent: customer.total_spent,
      }
    });

  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 