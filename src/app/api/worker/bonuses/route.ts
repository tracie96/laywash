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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    if (!workerId) {
      return NextResponse.json(
        { success: false, error: 'Worker ID is required' },
        { status: 400 }
      );
    }

    // Verify the worker exists and has car_washer role
    const { data: worker, error: workerError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role')
      .eq('id', workerId)
      .eq('role', 'car_washer')
      .single();

    if (workerError || !worker) {
      return NextResponse.json(
        { success: false, error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Build the query to fetch bonuses for this specific worker
    let query = supabaseAdmin
      .from('bonuses')
      .select('*')
      .eq('type', 'washer')
      .eq('recipient_id', workerId)
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: bonuses, error } = await query;

    if (error) {
      console.error('Error fetching worker bonuses:', error);
      
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

    // Transform the bonuses data
    const transformedBonuses = (bonuses || []).map(bonus => ({
      id: bonus.id,
      type: bonus.type,
      amount: bonus.amount,
      reason: bonus.reason,
      milestone: bonus.milestone,
      status: bonus.status,
      approvedBy: bonus.approved_by,
      approvedAt: bonus.approved_at,
      paidAt: bonus.paid_at,
      createdAt: bonus.created_at
    }));

    // Calculate summary statistics
    const totalBonuses = transformedBonuses.length;
    const pendingBonuses = transformedBonuses.filter(b => b.status === 'pending').length;
    const approvedBonuses = transformedBonuses.filter(b => b.status === 'approved').length;
    const paidBonuses = transformedBonuses.filter(b => b.status === 'paid').length;
    const rejectedBonuses = transformedBonuses.filter(b => b.status === 'rejected').length;
    
    const totalAmount = transformedBonuses.reduce((sum, bonus) => sum + bonus.amount, 0);
    const pendingAmount = transformedBonuses.filter(b => b.status === 'pending').reduce((sum, bonus) => sum + bonus.amount, 0);
    const approvedAmount = transformedBonuses.filter(b => b.status === 'approved').reduce((sum, bonus) => sum + bonus.amount, 0);
    const paidAmount = transformedBonuses.filter(b => b.status === 'paid').reduce((sum, bonus) => sum + bonus.amount, 0);

    return NextResponse.json({
      success: true,
      bonuses: transformedBonuses,
      summary: {
        totalBonuses,
        pendingBonuses,
        approvedBonuses,
        paidBonuses,
        rejectedBonuses,
        totalAmount,
        pendingAmount,
        approvedAmount,
        paidAmount
      },
      worker: {
        id: worker.id,
        name: worker.name,
        email: worker.email
      }
    });

  } catch (error) {
    console.error('Worker bonuses API error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}



