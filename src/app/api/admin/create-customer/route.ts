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
      whatsapp_number,
      dateOfBirth,
      vehicles
    } = await request.json();

    // Validate required input
    if (!name || !phone || !vehicles || vehicles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, phone, and at least one vehicle are required' },
        { status: 400 }
      );
    }

    // Check if email already exists (if provided)
    if (email && email.trim()) {
      const { data: existingCustomer, error: emailCheckError } = await supabaseAdmin
        .from('customers')
        .select('id, email')
        .eq('email', email.trim())
        .single();

      if (emailCheckError && emailCheckError.code !== 'PGRST116') { // PGRST116 = no rows found
        return NextResponse.json(
          { success: false, error: 'Error checking for existing email' },
          { status: 500 }
        );
      }

      if (existingCustomer) {
        return NextResponse.json(
          { success: false, error: 'A customer with this email address already exists' },
          { status: 400 }
        );
      }
    }

    // Validate vehicles
    for (const vehicle of vehicles) {
      if (!vehicle.licensePlate || !vehicle.vehicleType || !vehicle.vehicleColor) {
        return NextResponse.json(
          { success: false, error: 'All vehicles must have license plate, vehicle type, and vehicle color' },
          { status: 400 }
        );
      }
    }

    // Check if any license plate already exists
    const licensePlates = vehicles.map((v: { licensePlate: string }) => v.licensePlate);
    const { data: existingVehicles, error: checkError } = await supabaseAdmin
      .from('vehicles')
      .select('license_plate')
      .in('license_plate', licensePlates);

    if (checkError) {
      return NextResponse.json(
        { success: false, error: 'Error checking for existing vehicles' },
        { status: 500 }
      );
    }

    if (existingVehicles && existingVehicles.length > 0) {
      const existingPlates = existingVehicles.map(v => v.license_plate).join(', ');
      return NextResponse.json(
        { success: false, error: `Vehicles with license plates ${existingPlates} already exist` },
        { status: 400 }
      );
    }

    // Create customer in the database (without vehicle fields)
    const { data: customer, error: insertError } = await supabaseAdmin
      .from('customers')
      .insert({
        name,
        email: email || null,
        phone,
        whatsapp_number: whatsapp_number || null,
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

    // Insert vehicles into the vehicles table
    const vehiclesToInsert = vehicles.map((vehicle: { licensePlate: string; vehicleType: string; vehicleMake: string | null; vehicleModel: string | null; vehicleColor: string; isPrimary: boolean | undefined; }, index: number) => ({
      customer_id: customer.id,
      license_plate: vehicle.licensePlate,
      vehicle_type: vehicle.vehicleType,
      vehicle_make: vehicle.vehicleMake?.trim() || null,
      vehicle_model: vehicle.vehicleModel?.trim() || null,
      vehicle_color: vehicle.vehicleColor,
      is_primary: vehicle.isPrimary || index === 0, // First vehicle is primary by default
    }));

    const { data: insertedVehicles, error: vehiclesError } = await supabaseAdmin
      .from('vehicles')
      .insert(vehiclesToInsert)
      .select();

    if (vehiclesError) {
      console.error('Create vehicles error:', vehiclesError);
      // Rollback customer creation if vehicle creation fails
      await supabaseAdmin
        .from('customers')
        .delete()
        .eq('id', customer.id);
      
      return NextResponse.json(
        { success: false, error: 'Failed to create vehicles ' + vehiclesError.message },
        { status: 500 }
      );
    }

    // Fetch the complete customer data with vehicles (for future use)
    const { error: fetchError } = await supabaseAdmin
      .from('customers')
      .select(`
        *,
        vehicles:vehicles (
          id,
          license_plate,
          vehicle_type,
          vehicle_model,
          vehicle_color,
          is_primary,
          created_at,
          updated_at
        )
      `)
      .eq('id', customer.id)
      .single();

    if (fetchError) {
      console.error('Fetch complete customer error:', fetchError);
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        dateOfBirth: customer.date_of_birth,
        isRegistered: customer.is_registered,
        registrationDate: customer.registration_date,
        totalVisits: customer.total_visits,
        totalSpent: customer.total_spent,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
        vehicles: insertedVehicles?.map(v => ({
          id: v.id,
          customerId: v.customer_id,
          licensePlate: v.license_plate,
          vehicleType: v.vehicle_type,
          vehicleModel: v.vehicle_model,
          vehicleColor: v.vehicle_color,
          isPrimary: v.is_primary,
          createdAt: v.created_at,
          updatedAt: v.updated_at
        })) || []
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