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
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const workerId = searchParams.get('workerId') || 'all';
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Query tool charges from the tool_return_items table
    let query = supabaseAdmin
      .from('tool_return_items')
      .select(`
        *,
        return:daily_material_returns!tool_return_items_return_id_fkey (
          id,
          return_date,
          status,
          admin_notes,
          washer:users!daily_material_returns_washer_id_fkey (
            id,
            name,
            email,
            phone
          )
        )
      `)
      .order(sortBy === 'date' ? 'created_at' : 'deduction_amount', { ascending: sortOrder === 'asc' });

    // Apply filters
    if (search) {
      query = query.ilike('tool_name', `%${search}%`);
    }

    if (status && status !== 'all') {
      if (status === 'pending') {
        query = query.eq('return.status', 'pending');
      } else if (status === 'paid') {
        query = query.eq('return.status', 'completed');
      } else if (status === 'disputed') {
        query = query.eq('return.status', 'pending');
      }
    }

    if (workerId && workerId !== 'all') {
      query = query.eq('return.washer_id', workerId);
    }

    const { data: toolReturns, error } = await query;

    if (error) {
      console.error('Error fetching tool charges:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tool charges' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedCharges = toolReturns?.map(item => ({
      id: item.id,
      toolName: item.tool_name,
      workerName: item.return?.washer?.name || 'Unknown Worker',
      workerId: item.return?.washer?.id || '',
      chargeAmount: item.deduction_amount || 0,
      reason: item.missing_quantity > 0 ? 'Missing tool' : 'Damaged tool',
      date: item.return?.return_date || item.created_at,
      status: item.return?.status === 'completed' ? 'paid' : 
              item.return?.status === 'pending' ? 'pending' : 'disputed',
      replacementCost: item.deduction_amount || 0,
      notes: item.notes || item.return?.admin_notes || 'No notes',
      createdAt: item.created_at,
      updatedAt: item.created_at
    })) || [];

    // Apply additional filters that can't be done at database level
    let filteredCharges = transformedCharges;
    
    // Apply search filter for fields not covered by database query
    if (search) {
      filteredCharges = filteredCharges.filter(charge => 
        charge.workerName.toLowerCase().includes(search.toLowerCase()) ||
        charge.reason.toLowerCase().includes(search.toLowerCase()) ||
        charge.notes.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply sorting
    filteredCharges.sort((a, b) => {
      let aValue;
      let bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'chargeAmount':
          aValue = a.chargeAmount;
          bValue = b.chargeAmount;
          break;
        case 'toolName':
          aValue = a.toolName.toLowerCase();
          bValue = b.toolName.toLowerCase();
          break;
        case 'workerName':
          aValue = a.workerName.toLowerCase();
          bValue = b.workerName.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return NextResponse.json({
      success: true,
      charges: filteredCharges
    });

  } catch (error) {
    console.error('Fetch tool charges error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      toolName, 
      workerId, 
      workerName, 
      chargeAmount, 
      reason, 
      replacementCost, 
      notes 
    } = await request.json();

    // Validate required input
    if (!toolName || !workerId || !workerName || !chargeAmount || !reason || !replacementCost) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (chargeAmount < 0 || replacementCost < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid numeric values' },
        { status: 400 }
      );
    }

    // Create a new daily material return for the tool charge
    const { data: newReturn, error: returnError } = await supabaseAdmin
      .from('daily_material_returns')
      .insert({
        washer_id: workerId,
        admin_id: 'admin', // This should come from the authenticated user
        return_date: new Date().toISOString().split('T')[0],
        total_items_returned: 0,
        total_materials_returned: 0,
        deductions_amount: chargeAmount,
        status: 'pending',
        admin_notes: `Tool charge: ${reason} - ${notes || ''}`
      })
      .select()
      .single();

    if (returnError) {
      console.error('Error creating daily return:', returnError);
      return NextResponse.json(
        { success: false, error: 'Failed to create tool charge' },
        { status: 500 }
      );
    }

    // Create the tool return item
    const { data: newToolReturn, error: toolError } = await supabaseAdmin
      .from('tool_return_items')
      .insert({
        return_id: newReturn.id,
        tool_id: 'tool_id', // This should come from the request
        tool_name: toolName,
        assigned_quantity: 1,
        returned_quantity: 0,
        missing_quantity: 1,
        deduction_amount: chargeAmount,
        notes: notes || ''
      })
      .select()
      .single();

    if (toolError) {
      console.error('Error creating tool return item:', toolError);
      return NextResponse.json(
        { success: false, error: 'Failed to create tool charge item' },
        { status: 500 }
      );
    }

    // Transform the response to match the frontend interface
    const transformedCharge = {
      id: newToolReturn.id,
      toolName: newToolReturn.tool_name,
      workerName: workerName,
      workerId: workerId,
      chargeAmount: newToolReturn.deduction_amount,
      reason: reason,
      date: newReturn.return_date,
      status: 'pending',
      replacementCost: newToolReturn.deduction_amount,
      notes: newToolReturn.notes,
      createdAt: newToolReturn.created_at,
      updatedAt: newToolReturn.created_at
    };

    return NextResponse.json({
      success: true,
      charge: transformedCharge,
      message: 'Tool charge created successfully'
    });

  } catch (error) {
    console.error('Create tool charge error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
