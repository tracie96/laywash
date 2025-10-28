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

    // Get used quantities from check_in_materials for all tools using material_id
    const toolIds = tools?.map(tool => tool.id) || [];
    const usedQuantities: Record<string, number> = {};

    if (toolIds.length > 0) {
      const { data: usedMaterials, error: usedError } = await supabaseAdmin
        .from('check_in_materials')
        .select('material_id, quantity_used, washer_id')
        .in('material_id', toolIds);

      if (!usedError && usedMaterials) {
        // Calculate total used quantity for each tool by washer
        usedMaterials.forEach(used => {
          const key = `${used.material_id}_${used.washer_id}`;
          usedQuantities[key] = (usedQuantities[key] || 0) + used.quantity_used;
        });
      }
    }

    console.log({tools, usedQuantities});
    // Auto-update is_returned status for tools where used + returned = assigned
    for (const tool of tools || []) {
      const usedKey = `${tool.id}_${tool.washer_id}`;
      const usedQuantity = usedQuantities[usedKey] || 0;
      const returnedQuantity = tool.returned_quantity || 0;
      
      // If used + returned equals assigned quantity, mark as returned
      if ((usedQuantity + returnedQuantity >= tool.quantity) && !tool.is_returned) {
        // Fire and forget the update
        void supabaseAdmin
          .from('washer_tools')
          .update({ 
            is_returned: true,
            returned_date: new Date().toISOString()
          })
          .eq('id', tool.id);
        
        // Update the tool in memory immediately
        tool.is_returned = true;
        tool.returned_date = new Date().toISOString();
      }
    }

    const transformedTools = tools?.map(tool => {
      // Calculate used quantity from check_in_materials
      const usedKey = `${tool.id}_${tool.washer_id}`;
      const usedQuantity = usedQuantities[usedKey] || 0;
      const returnedQuantity = tool.returned_quantity || 0;
      
      // Calculate available quantity: assigned - used - returned
      // This follows the same logic as assignments: quantity - returnedQuantity
      // When some quantity is returned, it's no longer available for use
      const remainingQuantity = Math.max(0, tool.quantity - usedQuantity - returnedQuantity);

      return {
        id: tool.id,
        washerId: tool.washer_id,
        washer: tool.washer,
        toolName: tool.tool_name,
        toolType: tool.tool_type,
        quantity: remainingQuantity, // Remaining quantity (assigned - used - returned)
        assignedQuantity: tool.quantity, // Original assigned quantity
        usedQuantity: usedQuantity, // Quantity used from check_in_materials
        returnedQuantity: returnedQuantity, // Returned quantity
        price: tool.amount, // Changed from amount to price
        assignedDate: tool.assigned_date,
        returnedDate: tool.returned_date,
        isReturned: tool.is_returned,
        notes: tool.notes,
        createdAt: tool.created_at,
        updatedAt: tool.updated_at
      };
    }) || [];

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
      toolId,
      toolName, 
      toolType, 
      quantity, 
      notes,
      price
    } = await request.json();

    // Validate required input
    if (!washerId || !toolName || !toolType || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: washerId, toolName, toolType, and quantity are required' },
        { status: 400 }
      );
    }

    // Validate quantity
    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    // Log toolId if provided (for tracking the source tool)
    console.log('Received data:', { washerId, toolId, toolName, toolType, quantity, price });
    
    // Determine the cost to use: provided price > service replacement cost
    let finalCost = 0;
    
    if (price && price > 0) {
      // Use the provided price
      finalCost = price;
    } else {
      // Get replacement cost from services table where tool_name matches service name
      const { data: service, error: serviceError } = await supabaseAdmin
        .from('services')
        .select('replacement_cost')
        .eq('name', toolName)
        .single();

      if (serviceError) {
        console.error('Error fetching service replacement cost:', serviceError);
        // Don't fail, just use 0 as default
        finalCost = 0;
      } else {
        finalCost = service?.replacement_cost || 0;
      }
    }

    // Prepare insert data
    const insertData: Record<string, unknown> = {
      washer_id: washerId,
      tool_name: toolName,
      tool_type: toolType,
      quantity: quantity,
      amount: finalCost,
      notes: notes || null
    };

    // Only add tool_id if it's provided and not null
    if (toolId) {
      insertData.tool_id = toolId;
    }

    console.log('Inserting washer tool with data:', insertData);

    // Insert new washer tool
    const { data: tool, error } = await supabaseAdmin
      .from('washer_tools')
      .insert(insertData)
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
      price: tool.amount, // Use amount field from database
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




