import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { selectAll } from '@/lib/supabaseQuery';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client on server-side only
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface PaymentCheckIn {
  id: string;
  total_amount?: number;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  license_plate?: string;
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  wash_type?: string;
  check_in_time: string;
  actual_completion_time?: string | null;
  customer_id?: string;
  assigned_washer_id?: string;
  assigned_admin_id?: string;
  remarks?: string | null;
  valuable_items?: string | null;
  created_at: string;
  updated_at: string;
  user_code?: string | null;
  reason?: string | null;
  passcode?: string | null;
  customers?: {
    name?: string;
    phone?: string;
  };
  check_in_services?: Array<{
    service_name?: string;
    duration?: number;
  }>;
  assigned_washer?: {
    name?: string;
  };
  assigned_admin?: {
    name?: string;
  };
}

const parseDateBoundary = (dateValue: string, boundary: 'start' | 'end') => {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateValue);
  const date = isDateOnly
    ? new Date(`${dateValue}T${boundary === 'start' ? '00:00:00' : '23:59:59.999'}`)
    : new Date(dateValue);

  return Number.isNaN(date.getTime()) ? null : date;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const paymentMethod = searchParams.get('paymentMethod') || 'all';
    const sortBy = searchParams.get('sortBy') || 'check_in_time';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const currentAdminId = request.headers.get('X-Admin-ID');
    const startDateTime = startDate ? parseDateBoundary(startDate, 'start') : null;
    const endDateTime = endDate ? parseDateBoundary(endDate, 'end') : null;

    // Get admin location for filtering
    let isSuperAdmin = false;
    let locationAdminIds: string[] | null = null;
    
    if (currentAdminId) {
      const { data: adminUser } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', currentAdminId)
        .single();
      
      isSuperAdmin = adminUser?.role === 'super_admin';
      
      if (!isSuperAdmin) {
        const { data: adminProfile } = await supabaseAdmin
          .from('admin_profiles')
          .select('location')
          .eq('user_id', currentAdminId)
          .single();
        
        const adminLocation = adminProfile?.location || null;
        
        if (adminLocation) {
          const { data: locationAdmins } = await supabaseAdmin
            .from('admin_profiles')
            .select('user_id')
            .eq('location', adminLocation);
          
          locationAdminIds = locationAdmins?.map(a => a.user_id) || [];
        }
      }
    }

    const buildPaymentsQuery = () => {
      let query = supabaseAdmin
        .from('car_check_ins')
        // Only the columns the payment pages use; select * made "all time" responses ~25MB
        .select(`
          id,
          total_amount,
          status,
          payment_status,
          payment_method,
          license_plate,
          vehicle_type,
          vehicle_model,
          vehicle_color,
          wash_type,
          check_in_time,
          actual_completion_time,
          customer_id,
          assigned_washer_id,
          assigned_admin_id,
          remarks,
          valuable_items,
          created_at,
          updated_at,
          user_code,
          reason,
          passcode,
          customers (
            name,
            phone
          ),
          check_in_services (
            service_name,
            duration
          ),
          assigned_washer:users!car_check_ins_assigned_washer_id_fkey (
            name
          ),
          assigned_admin:users!car_check_ins_assigned_admin_id_fkey (
            name
          )
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .order('id');

      if (locationAdminIds && locationAdminIds.length > 0) {
        query = query.in('assigned_admin_id', locationAdminIds);
      }

      if (status !== 'all') {
        if (status === 'cancelled') {
          query = query.eq('status', 'cancelled');
        } else if (status === 'pending') {
          query = query.eq('payment_status', 'pending').neq('status', 'cancelled');
        } else {
          const paymentStatus = status === 'completed' ? 'paid' : status;
          query = query.eq('payment_status', paymentStatus);
        }
      }

      if (paymentMethod !== 'all') {
        query = query.eq('payment_method', paymentMethod);
      }

      if (startDateTime || endDateTime) {
        const dateFields = [
          'actual_completion_time',
          'updated_at',
          'check_in_time'
        ];
        const dateFilters = dateFields.map(field => {
          const conditions = [];
          if (startDateTime) conditions.push(`${field}.gte.${startDateTime.toISOString()}`);
          if (endDateTime) conditions.push(`${field}.lte.${endDateTime.toISOString()}`);
          return `and(${conditions.join(',')})`;
        });
        query = query.or(dateFilters.join(','));
      }

      return query;
    };

    let allCheckIns: PaymentCheckIn[];
    try {
      allCheckIns = await selectAll<PaymentCheckIn>(buildPaymentsQuery);
    } catch (error) {
      console.error('Fetch payments error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    // Filter the results in JavaScript based on search criteria
    let checkIns = allCheckIns || [];
    if (search) {
      const searchLower = search.toLowerCase();
      checkIns = checkIns.filter(checkIn => {
        const customerName = checkIn.customers?.name || '';
        const customerPhone = checkIn.customers?.phone || '';
        const licensePlate = checkIn.license_plate || '';
        
        return customerName.toLowerCase().includes(searchLower) ||
               customerPhone.toLowerCase().includes(searchLower) ||
               licensePlate.toLowerCase().includes(searchLower);
      });
    }

    // Transform the data to match the frontend interface
    const transformedPayments = checkIns?.map(checkIn => {
      // Extract services from check_in_services
      const services = checkIn.check_in_services?.map((cis: { service_name?: string }) => cis.service_name).filter(Boolean) || [];
      const serviceType = services.length > 0 ? services.join(', ') : 'Not specified';
      
      const paymentDate = checkIn.actual_completion_time || checkIn.updated_at || checkIn.check_in_time;

      return {
        id: checkIn.id,
        customerName: checkIn.customers?.name || 'Walk-in Customer',
        customerPhone: checkIn.customers?.phone || 'N/A',
        amount: checkIn.total_amount || 0, // Use total_amount like check-in history
        totalPrice: checkIn.total_amount || 0, // Add totalPrice field for consistency
        date: paymentDate,
        status: checkIn.status === 'cancelled' ? 'cancelled' : checkIn.payment_status === 'paid' ? 'completed' : 'pending',
        paymentMethod: checkIn.payment_method || 'Not specified',
        paymentStatus: checkIn.payment_status, // Add paymentStatus field
        serviceType: serviceType,
        services: services,
        licensePlate: checkIn.license_plate,
        vehicleType: checkIn.vehicle_type,
        vehicleModel: checkIn.vehicle_model,
        vehicleColor: checkIn.vehicle_color,
        washType: checkIn.wash_type, // Add washType field
        checkInTime: checkIn.check_in_time,
        completionTime: checkIn.actual_completion_time,
        customerId: checkIn.customer_id,
        assignedWasherId: checkIn.assigned_washer_id,
        assignedWasherName: checkIn.assigned_washer?.name,
        assignedAdminId: checkIn.assigned_admin_id,
        assignedAdminName: checkIn.assigned_admin?.name,
        remarks: checkIn.remarks,
        specialInstructions: checkIn.remarks || checkIn.valuable_items, // Add specialInstructions
        estimatedDuration: checkIn.check_in_services?.reduce((total: number, service: { duration?: number }) => total + (service.duration || 0), 0) || 0,
        actualDuration: checkIn.actual_completion_time && checkIn.check_in_time 
          ? Math.round((new Date(checkIn.actual_completion_time).getTime() - new Date(checkIn.check_in_time).getTime()) / (1000 * 60))
          : undefined,
        createdAt: checkIn.created_at,
        updatedAt: checkIn.updated_at,
        userCode: checkIn.user_code,
        reason: checkIn.reason,
        passcode: checkIn.passcode
      };
    }) || [];

    const filteredPayments = transformedPayments.filter(payment => {
      const paymentDate = new Date(payment.date);
      if (Number.isNaN(paymentDate.getTime())) return false;
      if (startDateTime && paymentDate < startDateTime) return false;
      if (endDateTime && paymentDate > endDateTime) return false;
      return true;
    });

    return NextResponse.json({
      success: true,
      payments: filteredPayments
    });

  } catch (error) {
    console.error('Fetch payments error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

