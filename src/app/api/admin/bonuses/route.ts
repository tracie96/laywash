import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SMSService } from '../../../../lib/sms';

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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build the query - fetch bonuses without joins
    let query = supabaseAdmin
      .from('bonuses')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply type filter
    if (type !== 'all') {
      query = query.eq('type', type);
    }

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: bonuses, error } = await query;

    if (error) {
      console.error('Error fetching bonuses:', error);
      
      // Check if the error is due to missing table
      if (error.message && error.message.includes('relation "bonuses" does not exist')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Bonuses table does not exist. Please create the bonuses table in your database first.',
            needsTableCreation: true
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to fetch bonuses' },
        { status: 500 }
      );
    }

    // Fetch recipient data separately
    const transformedBonuses = await Promise.all(
      (bonuses || []).map(async (bonus) => {
        let recipientName = 'Unknown';
        let recipientEmail = '';
        let recipientPhone = '';

        try {
          if (bonus.type === 'customer') {
            // Fetch customer data
            const { data: customer } = await supabaseAdmin
              .from('customers')
              .select('name, email, phone')
              .eq('id', bonus.recipient_id)
              .single();
            
            if (customer) {
              recipientName = customer.name;
              recipientEmail = customer.email || '';
              recipientPhone = customer.phone;
            }
          } else {
            // Fetch washer data
            const { data: washer } = await supabaseAdmin
              .from('users')
              .select('name, email, phone')
              .eq('id', bonus.recipient_id)
              .eq('role', 'car_washer')
              .single();
            
            if (washer) {
              recipientName = washer.name;
              recipientEmail = washer.email || '';
              recipientPhone = washer.phone;
            }
          }
        } catch (err) {
          console.error('Error fetching recipient data:', err);
        }

        return {
          id: bonus.id,
          type: bonus.type,
          recipientId: bonus.recipient_id,
          recipientName,
          recipientEmail,
          recipientPhone,
          amount: bonus.amount,
          reason: bonus.reason,
          milestone: bonus.milestone,
          status: bonus.status,
          approvedBy: bonus.approved_by,
          approvedAt: bonus.approved_at,
          paidAt: bonus.paid_at,
          createdAt: bonus.created_at,
          bonusType: bonus.bonus_type,
          serviceId: bonus.service_id,
          itemId: bonus.item_id
        };
      })
    );

    return NextResponse.json({
      success: true,
      bonuses: transformedBonuses
    });

  } catch (error) {
    console.error('Fetch bonuses error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      type, 
      recipientId, 
      amount, 
      reason, 
      milestone,
      bonusType, // 'cash', 'service', 'item'
      serviceId,
      itemId
    } = await request.json();

    // Validate required input
    if (!type || !recipientId || !amount || !reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, recipientId, amount, and reason are required' },
        { status: 400 }
      );
    }

    // Handle Inventory Item Logic
    if (bonusType === 'item' && itemId) {
      // Check and deduct stock
      const { data: item, error: itemError } = await supabaseAdmin
        .from('inventory')
        .select('name, current_stock')
        .eq('id', itemId)
        .single();

      if (itemError || !item) {
        return NextResponse.json(
          { success: false, error: 'Selected item not found' },
          { status: 400 }
        );
      }

      if (item.current_stock <= 0) {
        return NextResponse.json(
          { success: false, error: `Item "${item.name}" is out of stock` },
          { status: 400 }
        );
      }

      // Deduct stock
      const { error: updateError } = await supabaseAdmin
        .from('inventory')
        .update({ current_stock: item.current_stock - 1 })
        .eq('id', itemId);

      if (updateError) {
        console.error('Failed to deduct stock:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update inventory stock' },
          { status: 500 }
        );
      }
      
      // Log stock movement if table exists (optional, but good for tracking)
      // We'll skip for now to avoid errors if table doesn't match exactly, 
      // but in a real app, you'd want to record this.
    }

    // Validate type
    if (!['customer', 'washer'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid bonus type. Must be either "customer" or "washer"' },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Bonus amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if recipient exists and get their information
    let recipientExists = false;
    let recipientName = '';
    let recipientPhone = '';
    
    if (type === 'customer') {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id, name, phone')
        .eq('id', recipientId)
        .single();
      recipientExists = !!customer;
      if (customer) {
        recipientName = customer.name;
        recipientPhone = customer.phone;
      }
    } else {
      const { data: washer } = await supabaseAdmin
        .from('users')
        .select('id, name, phone')
        .eq('id', recipientId)
        .eq('role', 'car_washer')
        .single();
      recipientExists = !!washer;
      if (washer) {
        recipientName = washer.name;
        recipientPhone = washer.phone;
      }
    }

    if (!recipientExists) {
      return NextResponse.json(
        { success: false, error: `Recipient not found` },
        { status: 400 }
      );
    }

    // Create bonus in the database
    const { data: bonus, error: insertError } = await supabaseAdmin
      .from('bonuses')
      .insert({
        type,
        recipient_id: recipientId,
        amount,
        reason,
        milestone: milestone || null,
        bonus_type: bonusType || 'cash',
        service_id: serviceId || null,
        item_id: itemId || null,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Create bonus error:', insertError);
      
      // Check if the error is due to missing table
      if (insertError.message && insertError.message.includes('relation "bonuses" does not exist')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Bonuses table does not exist. Please create the bonuses table in your database first.',
            needsTableCreation: true
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to create bonus' },
        { status: 500 }
      );
    }

    // Send SMS notification for customer bonuses
    if (type === 'customer' && recipientPhone) {
      try {
        const smsMessage = `Congratulations ${recipientName}! You've been awarded a bonus of ₦${amount} for: ${reason}${milestone ? ` (${milestone})` : ''}. Thank you for being a valued customer at LayWasho!`;
        await SMSService.sendCustomMessage(recipientPhone, smsMessage);
        console.log('SMS sent successfully to customer for bonus award');
      } catch (smsError) {
        console.error('Failed to send SMS for bonus award:', smsError);
        // Don't fail the bonus creation if SMS fails
      }
    }

    return NextResponse.json({
      success: true,
      bonus: {
        id: bonus.id,
        type: bonus.type,
        recipientId: bonus.recipient_id,
        amount: bonus.amount,
        reason: bonus.reason,
        milestone: bonus.milestone,
        status: bonus.status,
        createdAt: bonus.created_at
      }
    });

  } catch (error) {
    console.error('Create bonus error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
