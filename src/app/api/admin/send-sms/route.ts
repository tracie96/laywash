import { NextRequest, NextResponse } from 'next/server';
import { SMSService } from '@/lib/sms';
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
    const currentAdminId = request.headers.get('X-Admin-ID');

    if (!currentAdminId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID not provided in headers' },
        { status: 400 }
      );
    }

    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', currentAdminId)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json(
        { success: false, error: 'Admin user not found' },
        { status: 404 }
      );
    }


    const body = await request.json();
    const { checkInId } = body;

    if (!checkInId) {
      return NextResponse.json(
        { success: false, error: 'Check-in ID is required' },
        { status: 400 }
      );
    }

    // Get check-in details from database
    const { data: checkIn, error: checkInError } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        *,
        customers (
          id,
          name,
          phone
        )
      `)
      .eq('id', checkInId)
      .single();

    if (checkInError || !checkIn) {
      return NextResponse.json(
        { success: false, error: 'Check-in not found' },
        { status: 404 }
      );
    }

    if (!checkIn.user_code) {
      return NextResponse.json(
        { success: false, error: 'No key code available for this check-in' },
        { status: 400 }
      );
    }

    // Get customer details from customers table
    let customerPhone = '';
    let customerName = '';

    if (checkIn.customer_id && checkIn.customers) {
      // Customer exists in customers table
      customerPhone = checkIn.customers.phone || '';
      customerName = checkIn.customers.name || 'Customer';
    } else {
      // For walk-in customers without customer_id, we can't send SMS
      return NextResponse.json(
        { success: false, error: 'Cannot send SMS to walk-in customers without phone number' },
        { status: 400 }
      );
    }

    if (!customerPhone) {
      return NextResponse.json(
        { success: false, error: 'Customer phone number not found' },
        { status: 400 }
      );
    }

    // Send SMS with key code
    const smsSent = await SMSService.sendKeyCode(
      customerPhone,
      customerName,
      checkIn.user_code,
      checkIn.locations?.name
    );

    if (smsSent) {
      return NextResponse.json({
        success: true,
        message: 'Key code sent successfully via SMS'
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send SMS. This may be due to Twilio geo restrictions for Nigerian phone numbers. Please enable international SMS in your Twilio account or use a local SMS provider.',
          errorCode: 'GEO_RESTRICTION'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in send-sms API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
