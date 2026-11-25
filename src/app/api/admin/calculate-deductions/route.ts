import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOutstandingCharges } from '@/lib/washerTools';

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
    const washerId = searchParams.get('washerId');

    if (!washerId) {
      return NextResponse.json(
        { success: false, error: 'washerId is required' },
        { status: 400 }
      );
    }

    // Unreturned = assigned - used on completed jobs - returned - already charged,
    // only once the expected return date has passed
    const { deductions, unreturnedItems } = await getOutstandingCharges(supabaseAdmin, washerId);

    return NextResponse.json({
      success: true,
      deductions,
      unreturnedItems,
      hasUnreturnedTools: unreturnedItems.length > 0
    });

  } catch (error) {
    console.error('Calculate deductions error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
