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
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build the query
    let query = supabaseAdmin
      .from('customers')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,license_plate.ilike.%${search}%`);
    }

    // Apply registration filter
    if (filter === 'registered') {
      query = query.eq('is_registered', true);
    } else if (filter === 'unregistered') {
      query = query.eq('is_registered', false);
    }

    const { data: customers, error } = await query;

    if (error) {
      console.error('Fetch customers error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch customers' },
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
      customers: transformedCustomers
    });

  } catch (error) {
    console.error('Fetch customers error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 