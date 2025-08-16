import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test if sales_transactions table exists
    const { data: transactions, error: transactionsError } = await supabase
      .from('sales_transactions')
      .select('*')
      .limit(1);

    // Test if sales_items table exists
    const { data: items, error: itemsError } = await supabase
      .from('sales_items')
      .select('*')
      .limit(1);

    // Test if stock_items table exists
    const { data: stock, error: stockError } = await supabase
      .from('stock_items')
      .select('*')
      .limit(1);

    // Test if customers table exists
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .limit(1);

    // Test if users table exists
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    return NextResponse.json({
      success: true,
      tables: {
        sales_transactions: {
          exists: !transactionsError,
          error: transactionsError?.message,
          sample: transactions?.[0] || null
        },
        sales_items: {
          exists: !itemsError,
          error: itemsError?.message,
          sample: items?.[0] || null
        },
        stock_items: {
          exists: !stockError,
          error: stockError?.message,
          sample: stock?.[0] || null
        },
        customers: {
          exists: !customersError,
          error: customersError?.message,
          sample: customers?.[0] || null
        },
        users: {
          exists: !usersError,
          error: usersError?.message,
          sample: users?.[0] || null
        }
      }
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Test failed' },
      { status: 500 }
    );
  }
}







