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
    const washerId = searchParams.get('washerId');
    const materialType = searchParams.get('materialType');
    const isReturned = searchParams.get('isReturned');

    let query = supabaseAdmin
      .from('washer_tools')
      .select(`
        *,
        washer:users!washer_tools_washer_id_fkey (
          id,
          name,
          email,
          phone
        )
      `)
      .order('assigned_date', { ascending: false });

    if (washerId) {
      query = query.eq('washer_id', washerId);
    }

    if (materialType) {
      query = query.eq('tool_type', materialType);
    }

    if (isReturned !== null) {
      query = query.eq('is_returned', isReturned === 'true');
    }

    const { data: tools, error } = await query;
    if (error) {
      console.error('Error fetching washer tools:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch washer tools' },
        { status: 500 }
      );
    }
    console.log({tools});
    const transformedTools = tools?.map(tool => ({
      id: tool.id,
      washerId: tool.washer_id,
      washer: tool.washer,
      toolName: tool.tool_name,
      toolType: tool.tool_type,
      quantity: tool.quantity,
      price: tool.amount, // Changed from amount to price
      assignedDate: tool.assigned_date,
      returnedDate: tool.returned_date,
      isReturned: tool.is_returned,
      notes: tool.notes,
      createdAt: tool.created_at,
      updatedAt: tool.updated_at
    })) || [];

    return NextResponse.json({
      success: true,
      tools: transformedTools
    });

  } catch (error) {
    console.error('Fetch washer tools error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      washerId, 
      toolName, 
      toolType, 
      quantity, 
      price, // Changed from amount to price
      notes 
    } = await request.json();

    // Validate required input
    if (!washerId || !toolName || !toolType || !quantity || price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: washerId, toolName, toolType, quantity, and price are required' },
        { status: 400 }
      );
    }

    // Validate quantity and price
    if (quantity <= 0 || price <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity and price must be greater than 0' },
        { status: 400 }
      );
    }

    // Insert new washer tool
    const { data: tool, error } = await supabaseAdmin
      .from('washer_tools')
      .insert({
        washer_id: washerId,
        tool_name: toolName,
        tool_type: toolType,
        quantity: quantity,
        price: price, // Changed from amount to price
        notes: notes || null
      })
      .select(`
        *,
        washer:users!washer_tools_washer_id_fkey (
          id,
          name,
          email,
          phone
        )
      `)
      .single();

    if (error) {
      console.error('Error creating washer material:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create washer material' },
        { status: 500 }
      );
    }

    const transformedTool = {
      id: tool.id,
      washerId: tool.washer_id,
      washer: tool.washer,
      toolName: tool.tool_name,
      toolType: tool.tool_type,
      quantity: tool.quantity,
      price: tool.price, 
      assignedDate: tool.assigned_date,
      returnedDate: tool.returned_date,
      isReturned: tool.is_returned,
      notes: tool.notes,
      createdAt: tool.created_at,
      updatedAt: tool.updated_at
    };

    return NextResponse.json({
      success: true,
      tool: transformedTool
    });

  } catch (error) {
    console.error('Create washer material error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}




