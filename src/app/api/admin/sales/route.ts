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

export async function POST(request: NextRequest) {
  try {
    // For now, use a simple approach - get admin ID from request body
    // In production, this should be properly authenticated
    const { 
      customerId, 
      items, 
      totalAmount, 
      paymentMethod, 
      adminId,
      remarks 
    } = await request.json();

    // Validate admin ID
    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID is required' },
        { status: 400 }
      );
    }

    // Verify admin exists and has proper role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', adminId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { success: false, error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Check if user has admin role
    if (userProfile.role !== 'admin' && userProfile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can create sales' },
        { status: 403 }
      );
    }

    // Validate required input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      );
    }

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid total amount' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.inventoryId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid item data' },
          { status: 400 }
        );
      }
    }

    // Start a transaction to ensure data consistency
    const { data: salesTransaction, error: salesError } = await supabaseAdmin
      .from('sales_transactions')
      .insert([{
        customer_id: customerId,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        admin_id: userProfile.id,
        remarks: remarks,
        status: 'completed',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (salesError) {
      console.error('Error creating sales transaction:', salesError);
      return NextResponse.json(
        { success: false, error: 'Failed to create sales transaction' },
        { status: 500 }
      );
    }

    // Create sales items and update inventory
    const salesItems = [];
    const inventoryUpdates = [];

    for (const item of items) {
      // Get current inventory item
      const { data: inventoryItem, error: inventoryError } = await supabaseAdmin
        .from('stock_items')
        .select('*')
        .eq('id', item.inventoryId)
        .single();

      if (inventoryError || !inventoryItem) {
        console.error('Error fetching inventory item:', inventoryError);
        return NextResponse.json(
          { success: false, error: `Inventory item not found: ${item.inventoryId}` },
          { status: 404 }
        );
      }

      // Check if enough stock is available
      if (inventoryItem.current_stock < item.quantity) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.current_stock}, Requested: ${item.quantity}` 
          },
          { status: 400 }
        );
      }

      // Create sales item record
      const { data: salesItem, error: salesItemError } = await supabaseAdmin
        .from('sales_items')
        .insert([{
          sales_transaction_id: salesTransaction.id,
          inventory_item_id: item.inventoryId,
          quantity: item.quantity,
          unit_price: item.unitPrice || inventoryItem.cost_per_unit,
          total_price: (item.unitPrice || inventoryItem.cost_per_unit) * item.quantity
        }])
        .select()
        .single();

      if (salesItemError) {
        console.error('Error creating sales item:', salesItemError);
        return NextResponse.json(
          { success: false, error: 'Failed to create sales item' },
          { status: 500 }
        );
      }

      salesItems.push(salesItem);

      // Update inventory stock
      const newStock = inventoryItem.current_stock - item.quantity;
      const { error: updateError } = await supabaseAdmin
        .from('stock_items')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.inventoryId);

      if (updateError) {
        console.error('Error updating inventory:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update inventory' },
          { status: 500 }
        );
      }

      inventoryUpdates.push({
        id: item.inventoryId,
        name: inventoryItem.name,
        previousStock: inventoryItem.current_stock,
        newStock: newStock,
        quantitySold: item.quantity
      });
    }

    // Create inventory movement records for audit trail
    for (const update of inventoryUpdates) {
      await supabaseAdmin
        .from('inventory_movements')
        .insert([{
          inventory_item_id: update.id,
          movement_type: 'out',
          quantity: update.quantitySold,
          previous_balance: update.previousStock,
          new_balance: update.newStock,
          reason: 'Sale transaction',
          admin_id: userProfile.id,
          reference_id: salesTransaction.id,
          reference_type: 'sales_transaction'
        }]);
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: salesTransaction.id,
        totalAmount: salesTransaction.total_amount,
        status: salesTransaction.status,
        createdAt: salesTransaction.created_at,
        items: salesItems,
        inventoryUpdates: inventoryUpdates
      }
    });

  } catch (error) {
    console.error('Create sale error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build the base query - simplified to avoid complex joins initially
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
        sales_items (
          quantity,
          unit_price,
          total_price
        ),
        admins:users!sales_transactions_admin_id_fkey (
          id,
          name,
          email
        )
      `)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit);

    // Apply search filter
    if (search) {
      query = query.or(`customers.name.ilike.%${search}%,customers.email.ilike.%${search}%`);
    }

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply date filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: sales, error } = await query;

    if (error) {
      console.error('Error fetching sales:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sales' },
        { status: 500 }
      );
    }

    console.log('Raw sales data:', sales); // Debug: log the raw data

    // Transform the data - simplified since we don't have item details from join
    const transformedSales = sales?.map(sale => ({
      id: sale.id,
      customerName: sale.customers?.name || 'Walk-in Customer',
      customerEmail: sale.customers?.email,
      customerPhone: sale.customers?.phone,
      totalAmount: sale.total_amount,
      paymentMethod: sale.payment_method,
      status: sale.status,
      adminName: sale.admins?.name || 'Unknown',
      createdAt: sale.created_at,
      items: sale.sales_items?.map((item: { quantity: number; unit_price: number; total_price: number; }) => ({
        name: 'Item Details Not Available', // Placeholder since we removed the join
        category: 'General',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price
      })) || [],
      remarks: sale.remarks
    })) || [];

    return NextResponse.json({
      success: true,
      sales: transformedSales
    });

  } catch (error) {
    console.error('Fetch sales error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
