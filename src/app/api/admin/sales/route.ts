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
    const { 
      items, 
      totalAmount, 
      adminId,
      customerId,
      paymentMethod,
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

    // Process inventory updates
    const inventoryUpdates = [];

    for (const item of items) {
      // Get current inventory item
      const { data: inventoryItem, error: inventoryError } = await supabaseAdmin
        .from('inventory')
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

      // Update inventory stock
      const newStock = inventoryItem.current_stock - item.quantity;
      const { error: updateError } = await supabaseAdmin
        .from('inventory')
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
        quantitySold: item.quantity,
        unitPrice: item.unitPrice || inventoryItem.cost_per_unit,
        totalPrice: (item.unitPrice || inventoryItem.cost_per_unit) * item.quantity
      });
    }

    // Create sales transaction record
    const { data: salesTransaction, error: transactionError } = await supabaseAdmin
      .from('sales_transactions')
      .insert({
        customer_id: customerId || null,
        total_amount: totalAmount,
        payment_method: paymentMethod || 'cash',
        admin_id: adminId,
        status: 'completed',
        remarks: remarks || null
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating sales transaction:', transactionError);
      return NextResponse.json(
        { success: false, error: 'Failed to create sales transaction record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sale completed successfully',
      totalAmount: totalAmount,
      transactionId: salesTransaction.id,
      itemsSold: inventoryUpdates,
      inventoryUpdates: inventoryUpdates.map(update => ({
        id: update.id,
        name: update.name,
        previousStock: update.previousStock,
        newStock: update.newStock,
        quantitySold: update.quantitySold
      }))
    });

  } catch (error) {
    console.error('Create sale error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // For now, return a simple response since we don't have sales tracking tables yet
    return NextResponse.json({
      success: true,
      message: 'Sales tracking not yet implemented',
      sales: []
    });
  } catch (error) {
    console.error('Fetch sales error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
