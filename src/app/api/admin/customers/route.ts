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

export async function GET(request: NextRequest) {
  try {
    // For now, skip complex authentication to get the system working
    // In production, this should be properly authenticated

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '10000'); // Increased limit to fetch all customers

    // Build the base query
    let query = supabaseAdmin
      .from('customers')
      .select(`
        *,
        vehicles:vehicles (
          id,
          license_plate,
          vehicle_type,
          vehicle_model,
          vehicle_color,
          vehicle_make,
          is_primary,
          created_at,
          updated_at
        )
      `)
      .order('name', { ascending: true })
      .limit(limit);

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: customers, error } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    // Get all customer IDs to fetch their check-in statistics
    const customerIds = (customers || []).map(c => c.id);
    
    
    const { data: checkInStats, error: statsError } = await supabaseAdmin
      .from('car_check_ins')
      .select('customer_id, total_amount, status, actual_completion_time, license_plate')
      .in('customer_id', customerIds);
        
    // Also try to get check-ins by license plate for customers without customer_id
    const customerLicensePlates = (customers || []).map(c => c.license_plate?.toUpperCase()).filter(Boolean);
    const { data: checkInStatsByPlate, error: statsByPlateError } = await supabaseAdmin
      .from('car_check_ins')
      .select('customer_id, total_amount, status, actual_completion_time, license_plate')
      .in('license_plate', customerLicensePlates)
      .is('customer_id', null);
        
    // Combine both results
    const allCheckInStats = [...(checkInStats || []), ...(checkInStatsByPlate || [])];

    if (statsError) {
      console.error('Error fetching check-in stats:', statsError);
    }
    
    if (statsByPlateError) {
      console.error('Error fetching check-in stats by plate:', statsByPlateError);
    }

    // Calculate statistics for each customer
    const customerStats: { [key: string]: { totalVisits: number; totalSpent: number; lastVisit?: string } } = {};
    
    // Create a map of license plates to customer IDs for matching
    const licensePlateToCustomerId: { [key: string]: string } = {};
    (customers || []).forEach(customer => {
      if (customer.license_plate) {
        licensePlateToCustomerId[customer.license_plate.toUpperCase()] = customer.id;
      }
    });
    
    allCheckInStats.forEach(checkIn => {
      let customerId = checkIn.customer_id;
      
      // If customer_id is null, try to match by license plate
      if (!customerId && checkIn.license_plate) {
        customerId = licensePlateToCustomerId[checkIn.license_plate.toUpperCase()];
      }
      
      if (!customerId) return; // Skip if we can't match to a customer
      
      if (!customerStats[customerId]) {
        customerStats[customerId] = { totalVisits: 0, totalSpent: 0 };
      }
      
      customerStats[customerId].totalVisits += 1;
      
      // Only count completed check-ins for spending
      if (checkIn.status === 'completed' && checkIn.total_amount) {
        customerStats[customerId].totalSpent += checkIn.total_amount;
      }
      
      // Track last visit
      if (checkIn.actual_completion_time) {
        const visitDate = new Date(checkIn.actual_completion_time);
        if (!customerStats[customerId].lastVisit || visitDate > new Date(customerStats[customerId].lastVisit!)) {
          customerStats[customerId].lastVisit = checkIn.actual_completion_time;
        }
      }
    });

    
    // Transform customers with calculated statistics
    const transformedCustomers = (customers || []).map(customer => {
      const stats = customerStats[customer.id] || { totalVisits: 0, totalSpent: 0 };
      
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        dateOfBirth: customer.date_of_birth,
        isRegistered: customer.is_registered,
        registrationDate: customer.registration_date,
        totalVisits: stats.totalVisits,
        totalSpent: stats.totalSpent,
        lastVisit: stats.lastVisit,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
        vehicles: customer.vehicles || []
      };
    });

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