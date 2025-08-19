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

// GET - Fetch vehicles for a specific customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const { data: customerVehicles, error } = await supabaseAdmin
      .from('customer_vehicles')
      .select(`
        *,
        vehicle:vehicles (
          id,
          license_plate,
          vehicle_type,
          vehicle_model,
          vehicle_color,
          vehicle_year,
          is_active,
          created_at,
          updated_at
        )
      `)
      .eq('customer_id', customerId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching customer vehicles:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch customer vehicles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customerVehicles: customerVehicles || []
    });

  } catch (error) {
    console.error('Fetch customer vehicles error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Add a vehicle to a customer
export async function POST(request: NextRequest) {
  try {
    const {
      customerId,
      vehicleId,
      isPrimary = false
    } = await request.json();

    // Validate required fields
    if (!customerId || !vehicleId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID and Vehicle ID are required' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if vehicle exists
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .select('id')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Check if this customer-vehicle relationship already exists
    const { data: existingRelationship } = await supabaseAdmin
      .from('customer_vehicles')
      .select('id')
      .eq('customer_id', customerId)
      .eq('vehicle_id', vehicleId)
      .single();

    if (existingRelationship) {
      return NextResponse.json(
        { success: false, error: 'This vehicle is already assigned to this customer' },
        { status: 400 }
      );
    }

    // If this is the first vehicle for the customer, make it primary
    const { data: existingVehicles } = await supabaseAdmin
      .from('customer_vehicles')
      .select('id')
      .eq('customer_id', customerId);

    const shouldBePrimary = existingVehicles?.length === 0 || isPrimary;

    // Insert the customer-vehicle relationship
    const { data: customerVehicle, error: insertError } = await supabaseAdmin
      .from('customer_vehicles')
      .insert({
        customer_id: customerId,
        vehicle_id: vehicleId,
        is_primary: shouldBePrimary
      })
      .select(`
        *,
        vehicle:vehicles (
          id,
          license_plate,
          vehicle_type,
          vehicle_model,
          vehicle_color,
          vehicle_year,
          is_active,
          created_at,
          updated_at
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating customer vehicle relationship:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to assign vehicle to customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customerVehicle
    });

  } catch (error) {
    console.error('Create customer vehicle error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}




