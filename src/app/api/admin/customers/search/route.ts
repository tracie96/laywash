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

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Search for customers by email
    const { data: customers, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Search customers error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to search customers' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedCustomers = customers?.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone,
      licensePlate: customer.license_plate,
      vehicleType: customer.vehicle_type,
      vehicleModel: customer.vehicle_model || '',
      vehicleColor: customer.vehicle_color,
      isRegistered: customer.is_registered,
      registrationDate: customer.registration_date,
      totalVisits: customer.total_visits,
      totalSpent: parseFloat(customer.total_spent || '0'),
      createdAt: customer.created_at,
      updatedAt: customer.updated_at
    })) || [];

    return NextResponse.json({
      success: true,
      customers: transformedCustomers,
      found: transformedCustomers.length > 0
    });

  } catch (error) {
    console.error('Search customers error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 