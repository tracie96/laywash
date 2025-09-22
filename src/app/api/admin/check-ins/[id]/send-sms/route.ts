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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: checkInId } = await params;
    console.log('Check-in ID:', checkInId);

    if (!checkInId) {
      return NextResponse.json(
        { success: false, error: 'Check-in ID is required' },
        { status: 400 }
      );
    }

    // Parse request body to get phone number
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
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

    // Get customer name
    let customerName = 'Customer';
    if (checkIn.customer_id && checkIn.customers) {
      customerName = checkIn.customers.name || 'Customer';
    }

    // Send SMS with key code to the provided phone number
    const smsSent = await SMSService.sendKeyCode(
      phoneNumber,
      customerName,
      checkIn.user_code
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
          error: 'Failed to send SMS via Kudisms. Please check your Kudisms account configuration and balance.',
          errorCode: 'SMS_SEND_FAILED'
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
