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

// DELETE - Delete an expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentAdminId = request.headers.get('X-Admin-ID');

    if (!currentAdminId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID is required' },
        { status: 401 }
      );
    }

    // Verify admin exists and get their role
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

    const isSuperAdmin = adminUser.role === 'super_admin';

    // Get the expense to check ownership
    const { data: expense, error: fetchError } = await supabaseAdmin
      .from('expenses')
      .select('id, admin_id')
      .eq('id', id)
      .single();

    if (fetchError || !expense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check if admin has permission to delete
    // Super admins can delete any expense, regular admins can only delete their own
    if (!isSuperAdmin && expense.admin_id !== currentAdminId) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this expense' },
        { status: 403 }
      );
    }

    // Delete the expense
    const { error: deleteError } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting expense:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete expense' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Expense deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

