import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function GET() {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('commission_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({
      success: true,
      settings: settings || {
        adminPercentage: 60,
        washerPercentage: 40,
        isActive: true
      }
    });
  } catch (error) {
    console.error('Error fetching commission settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { adminPercentage, washerPercentage, isActive } = await request.json();
    
    if (adminPercentage + washerPercentage !== 100) {
      return NextResponse.json({ 
        success: false, 
        error: 'Percentages must equal 100%' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('commission_settings')
      .upsert({
        adminPercentage,
        washerPercentage,
        isActive,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    console.error('Error updating commission settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' });
  }
}
