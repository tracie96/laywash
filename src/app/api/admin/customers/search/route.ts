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
    const licensePlate = searchParams.get('licensePlate');
    const name = searchParams.get('name');
    const phone = searchParams.get('phone');
    const query = searchParams.get('query'); // General search query

    // If specific parameters are provided, use them
    if (email || licensePlate || name || phone) {
      let query = supabaseAdmin
        .from('customers')
        .select(`
          *,
          vehicles (
            id,
            license_plate,
            vehicle_type,
            vehicle_model,
            vehicle_color,
            is_primary
          )
        `)
        .order('created_at', { ascending: false });

      if (email) {
        query = query.eq('email', email);
      }
      if (name) {
        query = query.ilike('name', `%${name}%`);
      }
      if (phone) {
        query = query.eq('phone', phone);
      }
      if (licensePlate) {
        // Search in vehicles table for license plate
        query = query.eq('vehicles.license_plate', licensePlate);
      }

      const { data: customers, error } = await query;
      
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
        vehicles: customer.vehicles || [],
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
    }

    // If general query is provided, search across multiple fields
    if (query) {
      const { data: customers, error } = await supabaseAdmin
        .from('customers')
        .select(`
          *,
          vehicles (
            id,
            license_plate,
            vehicle_type,
            vehicle_model,
            vehicle_color,
            is_primary
          )
        `)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Search customers error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to search customers' },
          { status: 500 }
        );
      }

      // Also search for vehicles with matching license plate
      const { data: vehiclesWithCustomers, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .select(`
          *,
          customers (
            id,
            name,
            email,
            phone,
            is_registered,
            registration_date,
            total_visits,
            total_spent,
            created_at,
            updated_at
          )
        `)
        .ilike('license_plate', `%${query}%`);

      if (vehicleError) {
        console.error('Search vehicles error:', vehicleError);
      }

      // Combine and deduplicate results
      const allCustomers = new Map();
      
      // Add customers from direct search
      customers?.forEach(customer => {
        allCustomers.set(customer.id, {
          id: customer.id,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone,
          vehicles: customer.vehicles || [],
          isRegistered: customer.is_registered,
          registrationDate: customer.registration_date,
          totalVisits: customer.total_visits,
          totalSpent: parseFloat(customer.total_spent || '0'),
          createdAt: customer.created_at,
          updatedAt: customer.updated_at
        });
      });

      // Add customers from vehicle search
      vehiclesWithCustomers?.forEach(vehicle => {
        if (vehicle.customers && !allCustomers.has(vehicle.customers.id)) {
          allCustomers.set(vehicle.customers.id, {
            id: vehicle.customers.id,
            name: vehicle.customers.name,
            email: vehicle.customers.email || '',
            phone: vehicle.customers.phone,
            vehicles: [vehicle],
            isRegistered: vehicle.customers.is_registered,
            registrationDate: vehicle.customers.registration_date,
            totalVisits: vehicle.customers.total_visits,
            totalSpent: parseFloat(vehicle.customers.total_spent || '0'),
            createdAt: vehicle.customers.created_at,
            updatedAt: vehicle.customers.updated_at
          });
        }
      });

      const transformedCustomers = Array.from(allCustomers.values());

      return NextResponse.json({
        success: true,
        customers: transformedCustomers,
        found: transformedCustomers.length > 0
      });
    }

    return NextResponse.json(
      { success: false, error: 'Search parameter is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Search customers error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 