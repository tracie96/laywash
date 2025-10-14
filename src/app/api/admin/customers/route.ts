import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface Vehicle {
  id: string;
  license_plate: string;
  vehicle_type: string;
  vehicle_model: string;
  vehicle_color: string;
  vehicle_make: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomerWithVehicles {
  id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  is_registered: boolean;
  registration_date: string;
  license_plate?: string;
  created_at: string;
  updated_at: string;
  vehicles: Vehicle[];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * GET /api/admin/customers
 * 
 * Location-Based Access Control:
 * - Super admins: Can see ALL customers
 * - Location admins: Can only see customers assigned to admins at their location
 *   1. Get the current admin's location
 *   2. Find all admins at the same location
 *   3. Filter customers where assigned_admin_id is in that location's admin list
 */
export async function GET(request: NextRequest) {
  try {
    // Get current admin user from request header (optional for super admins)
    const currentAdminId = request.headers.get('X-Admin-ID');
    
    let isSuperAdmin = false;
    let locationAdminIds: string[] | null = null;
    
    // If admin ID is provided, check if they're a super admin and get their location
    if (currentAdminId) {
      const { data: adminUser } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', currentAdminId)
        .single();
      
      isSuperAdmin = adminUser?.role === 'super_admin';
      
      // Get admin's location if not super admin
      if (!isSuperAdmin) {
        const { data: adminProfile } = await supabaseAdmin
          .from('admin_profiles')
          .select('location')
          .eq('user_id', currentAdminId)
          .single();
        
        const adminLocation = adminProfile?.location || null;
        
        // Get all admins at the same location
        if (adminLocation) {
          const { data: locationAdmins } = await supabaseAdmin
            .from('admin_profiles')
            .select('user_id')
            .eq('location', adminLocation);
          
          locationAdminIds = locationAdmins?.map(a => a.user_id) || [];
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '10000');

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

    if (locationAdminIds && locationAdminIds.length > 0) {
      query = query.in('assigned_admin_id', locationAdminIds);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: customers, error } = await query;

    let customersByVehicle: CustomerWithVehicles[] = [];
    if (search) {
      const { data: vehicles, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .select('customer_id')
        .ilike('license_plate', `%${search}%`);
      
      if (!vehicleError && vehicles && vehicles.length > 0) {
        const vehicleCustomerIds = vehicles.map(v => v.customer_id).filter(Boolean);
        
        if (vehicleCustomerIds.length > 0) {
          let vehicleQuery = supabaseAdmin
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
            .in('id', vehicleCustomerIds)
            .order('name', { ascending: true })
            .limit(limit);
          
          // Also filter by location for vehicle search results
          if (locationAdminIds && locationAdminIds.length > 0) {
            vehicleQuery = vehicleQuery.in('assigned_admin_id', locationAdminIds);
          }
          
          const { data: customersByVehicleData, error: customersByVehicleError } = await vehicleQuery;
          
          if (!customersByVehicleError) {
            customersByVehicle = customersByVehicleData || [];
          }
        }
      }
    }

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    // Combine customers from both queries and remove duplicates
    const allCustomers = [...(customers || []), ...customersByVehicle];
    const uniqueCustomers = allCustomers.filter((customer, index, self) => 
      index === self.findIndex(c => c.id === customer.id)
    );

    // Fetch all check-ins and match them to customers in memory
    let checkInStatsQuery = supabaseAdmin
      .from('car_check_ins')
      .select('customer_id, total_amount, status, actual_completion_time, payment_status')
      .not('customer_id', 'is', null);
    
    // Filter by location (through assigned_admin_id)
    if (locationAdminIds && locationAdminIds.length > 0) {
      checkInStatsQuery = checkInStatsQuery.in('assigned_admin_id', locationAdminIds);
    }

    const { data: checkInStats, error: statsError } = await checkInStatsQuery;

    if (statsError) {
      console.error('Error fetching check-in stats:', statsError);
    }

    // Create a Set of customer IDs for quick lookup
    const customerIdSet = new Set(uniqueCustomers.map(c => c.id));

    // Calculate statistics for each customer
    const customerStats: { [key: string]: { totalVisits: number; totalSpent: number; lastVisit?: string } } = {};
    
    (checkInStats || []).forEach(checkIn => {
      const customerId = checkIn.customer_id;
      
      // Only count check-ins for customers in our current list
      if (!customerId || !customerIdSet.has(customerId)) return;
      
      if (!customerStats[customerId]) {
        customerStats[customerId] = { totalVisits: 0, totalSpent: 0 };
      }
      
      // Only count paid check-ins for total visits
      if (checkIn.payment_status === 'paid') {
        customerStats[customerId].totalVisits += 1;
      }
      
      // Only count completed check-ins for spending
      if (checkIn.status === 'completed' && checkIn.total_amount) {
        customerStats[customerId].totalSpent += checkIn.total_amount;
      }
      
      // Track last visit (only for paid check-ins)
      if (checkIn.payment_status === 'paid' && checkIn.actual_completion_time) {
        const visitDate = new Date(checkIn.actual_completion_time);
        if (!customerStats[customerId].lastVisit || visitDate > new Date(customerStats[customerId].lastVisit!)) {
          customerStats[customerId].lastVisit = checkIn.actual_completion_time;
        }
      }
    });

    
    // Transform customers with calculated statistics
    const transformedCustomers = uniqueCustomers.map(customer => {
      const stats = customerStats[customer.id] || { totalVisits: 0, totalSpent: 0 };
      
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        whatsapp_number: customer.whatsapp_number,
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