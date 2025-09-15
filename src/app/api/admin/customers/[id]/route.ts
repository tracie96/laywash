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
      whatsapp_number,
      vehicles,
      dateOfBirth
    } = body;

    // Validate required fields
    if (!name || !phone || !vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    // Validate vehicles array
    for (const vehicle of vehicles) {
      if (!vehicle.licensePlate || !vehicle.vehicleType || !vehicle.vehicleColor) {
        return NextResponse.json(
          { success: false, error: 'All vehicles must have license plate, type, and color' },
          { status: 400 }
        );
      }
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

    // Check if any license plate is already taken by another customer's vehicle
    const licensePlates = vehicles.map(v => v.licensePlate.trim().toUpperCase());
    const { data: existingVehicles } = await supabaseAdmin
      .from('vehicles')
      .select('id, customer_id, license_plate')
      .in('license_plate', licensePlates)
      .neq('customer_id', id);

    if (existingVehicles && existingVehicles.length > 0) {
      return NextResponse.json(
        { success: false, error: `License plate(s) already exist for another customer: ${existingVehicles.map(v => v.license_plate).join(', ')}` },
        { status: 400 }
      );
    }

    // Update the customer (only customer fields, not vehicle fields)
    const customerUpdateData: {
      name: string;
      phone: string;
      updated_at: string;
      email?: string;
      whatsapp_number?: string;
      date_of_birth?: string;
    } = {
      name: name.trim(),
      phone: phone.trim(),
      updated_at: new Date().toISOString()
    };

    // Add optional fields
    if (email && email.trim()) {
      customerUpdateData.email = email.trim().toLowerCase();
    }
    if (whatsapp_number && whatsapp_number.trim()) {
      customerUpdateData.whatsapp_number = whatsapp_number.trim();
    }
    if (dateOfBirth) {
      customerUpdateData.date_of_birth = dateOfBirth;
    }

    const { data: updatedCustomer, error: updateError } = await supabaseAdmin
      .from('customers')
      .update(customerUpdateData)
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

    // Get existing vehicles for this customer
    const { data: existingCustomerVehicles } = await supabaseAdmin
      .from('vehicles')
      .select('id, license_plate')
      .eq('customer_id', id);

    const existingVehiclesMap = new Map(
      existingCustomerVehicles?.map(v => [v.license_plate, v.id]) || []
    );

    // Separate new vehicles from existing ones
    const newVehicles = [];
    const vehiclesToUpdate = [];

    for (const vehicle of vehicles) {
      const licensePlate = vehicle.licensePlate.trim().toUpperCase();
      if (existingVehiclesMap.has(licensePlate)) {
        vehiclesToUpdate.push({
          id: existingVehiclesMap.get(licensePlate),
          ...vehicle
        });
      } else {
        newVehicles.push(vehicle);
      }
    }

    // Update existing vehicles
    for (const vehicle of vehiclesToUpdate) {
      const { error: updateError } = await supabaseAdmin
        .from('vehicles')
        .update({
          license_plate: vehicle.licensePlate.trim().toUpperCase(),
          vehicle_type: vehicle.vehicleType,
          vehicle_make: vehicle.vehicleMake?.trim() || null,
          vehicle_model: vehicle.vehicleModel?.trim() || null,
          vehicle_color: vehicle.vehicleColor.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicle.id);

      if (updateError) {
        console.error('Update vehicle error:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update vehicle information' },
          { status: 500 }
        );
      }
    }

    // Insert new vehicles
    if (newVehicles.length > 0) {
      const vehiclesToInsert = newVehicles.map((vehicle) => ({
        customer_id: id,
        license_plate: vehicle.licensePlate.trim().toUpperCase(),
        vehicle_type: vehicle.vehicleType,
        vehicle_make: vehicle.vehicleMake?.trim() || null,
        vehicle_model: vehicle.vehicleModel?.trim() || null,
        vehicle_color: vehicle.vehicleColor.trim(),
        is_primary: false // New vehicles are not primary by default
      }));

      const { error: vehicleInsertError } = await supabaseAdmin
        .from('vehicles')
        .insert(vehiclesToInsert);

      if (vehicleInsertError) {
        console.error('Insert vehicles error:', vehicleInsertError);
        return NextResponse.json(
          { success: false, error: 'Failed to add vehicle information' },
          { status: 500 }
        );
      }
    }

    // Fetch the updated vehicle data
    const { data: customerVehicles } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('customer_id', id)
      .order('is_primary', { ascending: false });

    // Transform the data to match the frontend interface
    const transformedCustomer = {
      id: updatedCustomer.id,
      name: updatedCustomer.name,
      email: updatedCustomer.email || '',
      phone: updatedCustomer.phone,
      whatsapp_number: updatedCustomer.whatsapp_number || '',
      licensePlate: customerVehicles?.[0]?.license_plate || '',
      vehicleType: customerVehicles?.[0]?.vehicle_type || '',
      vehicleModel: customerVehicles?.[0]?.vehicle_model || '',
      vehicleColor: customerVehicles?.[0]?.vehicle_color || '',
      dateOfBirth: updatedCustomer.date_of_birth,
      isRegistered: updatedCustomer.is_registered,
      registrationDate: updatedCustomer.registration_date,
      totalVisits: updatedCustomer.total_visits,
      totalSpent: parseFloat(updatedCustomer.total_spent || '0'),
      createdAt: updatedCustomer.created_at,
      updatedAt: updatedCustomer.updated_at,
      vehicles: customerVehicles?.map(v => ({
        id: v.id,
        license_plate: v.license_plate,
        vehicle_type: v.vehicle_type,
        vehicle_make: v.vehicle_make,
        vehicle_model: v.vehicle_model,
        vehicle_color: v.vehicle_color,
        is_primary: v.is_primary
      })) || []
    };

    const updateMessage = vehiclesToUpdate.length > 0 && newVehicles.length > 0 
      ? `Customer updated successfully. Updated ${vehiclesToUpdate.length} vehicle(s) and added ${newVehicles.length} new vehicle(s).`
      : vehiclesToUpdate.length > 0 
      ? `Customer updated successfully. Updated ${vehiclesToUpdate.length} vehicle(s).`
      : newVehicles.length > 0
      ? `Customer updated successfully. Added ${newVehicles.length} new vehicle(s).`
      : 'Customer updated successfully.';

    return NextResponse.json({
      success: true,
      customer: transformedCustomer,
      message: updateMessage
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

    // Fetch customer vehicles
    const { data: customerVehicles } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('customer_id', id)
      .order('is_primary', { ascending: false });

    // Get all license plates for this customer
    const licensePlates = customerVehicles?.map(v => v.license_plate) || [];

    // Fetch check-in statistics for this customer
    // First try to get check-ins by customer_id
    const { data: checkInStats, error: statsError } = await supabaseAdmin
      .from('car_check_ins')
      .select('total_amount, status, actual_completion_time, license_plate')
      .eq('customer_id', id);
    
    // Also try to get check-ins by license plates for customers without customer_id
    let checkInStatsByPlate: Array<{
      total_amount: number;
      status: string;
      actual_completion_time: string;
      license_plate: string;
    }> = [];
    let statsByPlateError: Error | null = null;
    
    if (licensePlates.length > 0) {
      const { data: plateStats, error: plateError } = await supabaseAdmin
        .from('car_check_ins')
        .select('total_amount, status, actual_completion_time, license_plate')
        .in('license_plate', licensePlates)
        .is('customer_id', null);
      
      checkInStatsByPlate = plateStats || [];
      statsByPlateError = plateError;
      
      if (statsByPlateError) {
        console.error('Error fetching check-in stats by plate:', statsByPlateError);
      }
    }
    
    // Combine both results
    const allCheckInStats = [...(checkInStats || []), ...checkInStatsByPlate];

    if (statsError) {
      console.error('Error fetching check-in stats:', statsError);
    }

    // Calculate statistics
    const allCheckIns = allCheckInStats || [];
    const totalVisits = allCheckIns.length;
    const completedCheckIns = allCheckIns.filter(ci => ci.status === 'completed');
    const totalSpent = completedCheckIns.reduce((sum, ci) => sum + (ci.total_amount || 0), 0);
    
    // Get last visit date
    let lastVisit: string | undefined;
    if (completedCheckIns.length > 0) {
      const sortedByDate = completedCheckIns
        .filter(ci => ci.actual_completion_time)
        .sort((a, b) => new Date(b.actual_completion_time!).getTime() - new Date(a.actual_completion_time!).getTime());
      lastVisit = sortedByDate[0]?.actual_completion_time;
    }

    // Transform the data to match the frontend interface
    const transformedCustomer = {
      id: customer.id,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone,
      licensePlate: customerVehicles?.[0]?.license_plate || '',
      vehicleType: customerVehicles?.[0]?.vehicle_type || '',
      vehicleModel: customerVehicles?.[0]?.vehicle_model || '',
      vehicleColor: customerVehicles?.[0]?.vehicle_color || '',
      dateOfBirth: customer.date_of_birth,
      isRegistered: customer.is_registered,
      registrationDate: customer.registration_date,
      totalVisits,
      totalSpent,
      lastVisit,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
      vehicles: customerVehicles?.map(v => ({
        id: v.id,
        license_plate: v.license_plate,
        vehicle_type: v.vehicle_type,
        vehicle_make: v.vehicle_make,
        vehicle_model: v.vehicle_model,
        vehicle_color: v.vehicle_color,
        is_primary: v.is_primary
      })) || []
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








