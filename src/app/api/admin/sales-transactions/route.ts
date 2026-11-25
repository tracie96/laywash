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
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || (startDate || endDate ? '1000' : '50'));

    // Build the query for sales transactions
    let query = supabaseAdmin
      .from('sales_transactions')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        ),
        users!sales_transactions_admin_id_fkey (
          id,
          name,
          email
        ),
        inventory (
          id,
          name,
          category,
          unit
        )
      `)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit);

    // Apply search filter
    if (search) {
      query = query.or(`customers.name.ilike.%${search}%,customers.email.ilike.%${search}%,customers.phone.ilike.%${search}%`);
    }

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply payment method filter
    if (paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod);
    }

    if (startDate) {
      const startDateTime = parseDateBoundary(startDate, 'start');
      if (startDateTime) {
        query = query.gte('created_at', startDateTime.toISOString());
      }
    }

    if (endDate) {
      const endDateTime = parseDateBoundary(endDate, 'end');
      if (endDateTime) {
        query = query.lte('created_at', endDateTime.toISOString());
      }
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Fetch sales transactions error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sales transactions' },
        { status: 500 }
      );
    }

    // Log the first transaction to debug the structure


    return NextResponse.json({
      success: true,
      transactions: transactions || []
    });

  } catch (error) {
    console.error('Fetch sales transactions error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
