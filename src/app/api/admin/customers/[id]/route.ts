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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const {
      name,
      email,
      phone,
      licensePlate,
      vehicleType,
      vehicleModel,
      vehicleColor,
      dateOfBirth
    } = body;

    // Validate required fields
    if (!name || !phone || !licensePlate || !vehicleType || !vehicleColor) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const { data: existingCustomer, error: fetchError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if license plate is already taken by another customer
    if (licensePlate !== existingCustomer.license_plate) {
      const { data: duplicateCustomer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('license_plate', licensePlate)
        .neq('id', id)
        .single();

      if (duplicateCustomer) {
        return NextResponse.json(
          { success: false, error: 'License plate already exists for another customer' },
          { status: 400 }
        );
      }
    }

    // Update the customer
    const updateData: {
      name: string;
      phone: string;
      license_plate: string;
      vehicle_type: string;
      vehicle_color: string;
      updated_at: string;
      email?: string;
      vehicle_model?: string;
      date_of_birth?: string;
    } = {
      name: name.trim(),
      phone: phone.trim(),
      license_plate: licensePlate.trim().toUpperCase(),
      vehicle_type: vehicleType,
      vehicle_color: vehicleColor.trim(),
      updated_at: new Date().toISOString()
    };

    // Add optional fields
    if (email && email.trim()) {
      updateData.email = email.trim().toLowerCase();
    }
    if (vehicleModel && vehicleModel.trim()) {
      updateData.vehicle_model = vehicleModel.trim();
    }
    if (dateOfBirth) {
      updateData.date_of_birth = dateOfBirth;
    }

    const { data: updatedCustomer, error: updateError } = await supabaseAdmin
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Update customer error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update customer' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedCustomer = {
      id: updatedCustomer.id,
      name: updatedCustomer.name,
      email: updatedCustomer.email || '',
      phone: updatedCustomer.phone,
      licensePlate: updatedCustomer.license_plate,
      vehicleType: updatedCustomer.vehicle_type,
      vehicleModel: updatedCustomer.vehicle_model || '',
      vehicleColor: updatedCustomer.vehicle_color,
      dateOfBirth: updatedCustomer.date_of_birth,
      isRegistered: updatedCustomer.is_registered,
      registrationDate: updatedCustomer.registration_date,
      totalVisits: updatedCustomer.total_visits,
      totalSpent: parseFloat(updatedCustomer.total_spent || '0'),
      createdAt: updatedCustomer.created_at,
      updatedAt: updatedCustomer.updated_at
    };

    return NextResponse.json({
      success: true,
      customer: transformedCustomer,
      message: 'Customer updated successfully'
    });

  } catch (error) {
    console.error('Update customer error:', error);
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
    const { id } = await params;

    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedCustomer = {
      id: customer.id,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone,
      licensePlate: customer.license_plate,
      vehicleType: customer.vehicle_type,
      vehicleModel: customer.vehicle_model || '',
      vehicleColor: customer.vehicle_color,
      dateOfBirth: customer.date_of_birth,
      isRegistered: customer.is_registered,
      registrationDate: customer.registration_date,
      totalVisits: customer.total_visits,
      totalSpent: parseFloat(customer.total_spent || '0'),
      createdAt: customer.created_at,
      updatedAt: customer.updated_at
    };

    return NextResponse.json({
      success: true,
      customer: transformedCustomer
    });

  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}








