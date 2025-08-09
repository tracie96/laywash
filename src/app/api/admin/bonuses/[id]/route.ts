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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action, approvedBy } = await request.json();

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    let updateData: { status?: string; approved_by?: string; approved_at?: string; paid_at?: string } = {};

    switch (action) {
      case 'approve':
        if (!approvedBy) {
          return NextResponse.json(
            { success: false, error: 'ApprovedBy is required for approval' },
            { status: 400 }
          );
        }
        updateData = {
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString()
        };
        break;

      case 'pay':
        updateData = {
          status: 'paid',
          paid_at: new Date().toISOString()
        };
        break;

      case 'reject':
        updateData = {
          status: 'rejected'
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Must be approve, pay, or reject' },
          { status: 400 }
        );
    }

    // Update the bonus
    const { data: bonus, error } = await supabaseAdmin
      .from('bonuses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update bonus error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update bonus' },
        { status: 500 }
      );
    }

    if (!bonus) {
      return NextResponse.json(
        { success: false, error: 'Bonus not found' },
        { status: 404 }
      );
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
        approvedBy: bonus.approved_by,
        approvedAt: bonus.approved_at,
        paidAt: bonus.paid_at,
        createdAt: bonus.created_at
      }
    });

  } catch (error) {
    console.error('Update bonus error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if bonus exists and is not already paid
    const { data: existingBonus, error: checkError } = await supabaseAdmin
      .from('bonuses')
      .select('status')
      .eq('id', id)
      .single();

    if (checkError) {
      return NextResponse.json(
        { success: false, error: 'Bonus not found' },
        { status: 404 }
      );
    }

    if (existingBonus.status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a paid bonus' },
        { status: 400 }
      );
    }

    // Delete the bonus
    const { error } = await supabaseAdmin
      .from('bonuses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete bonus error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete bonus' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bonus deleted successfully'
    });

  } catch (error) {
    console.error('Delete bonus error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
