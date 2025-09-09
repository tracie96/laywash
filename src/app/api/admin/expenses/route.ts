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

// GET - Fetch all expenses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const serviceType = searchParams.get('serviceType');
    const locationId = searchParams.get('locationId');

    let query = supabaseAdmin
      .from('expenses')
      .select(`
        *,
        admin:admin_id (
          id,
          name,
          email
        ),
        location:location_id (
          id,
          address
        ),
        check_in:check_in_id (
          id,
          license_plate,
          total_amount
        )
      `)
      .order('expense_date', { ascending: false });

    // Apply filters
    if (startDate && endDate) {
      query = query.gte('expense_date', startDate).lte('expense_date', endDate);
    }

    if (serviceType) {
      query = query.eq('service_type', serviceType);
    }

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data: expenses, error } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch expenses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      expenses: expenses || []
    });

  } catch (error) {
    console.error('Expenses fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      serviceType,
      amount,
      reason,
      description,
      adminId,
      checkInId,
      locationId,
      expenseDate
    } = body;

    // Validate required fields
    if (!serviceType || !amount || !reason) {
      return NextResponse.json(
        { success: false, error: 'Service type, amount, and reason are required' },
        { status: 400 }
      );
    }

    // Validate service type
    const validServiceTypes = ['checkin', 'salary', 'sales', 'free_will', 'deposit_to_bank', 'other'];
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid service type' },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const { data: expense, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        service_type: serviceType,
        amount: parseFloat(amount),
        reason,
        description: description || null,
        admin_id: adminId || null,
        check_in_id: checkInId || null,
        location_id: locationId || null,
        expense_date: expenseDate || new Date().toISOString()
      })
      .select(`
        *,
        admin:admin_id (
          id,
          name,
          email
        ),
        location:location_id (
          id,
          address
        ),
        check_in:check_in_id (
          id,
          license_plate,
          total_amount
        )
      `)
      .single();

    if (error) {
      console.error('Error creating expense:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create expense' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      expense
    });

  } catch (error) {
    console.error('Expense creation error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
