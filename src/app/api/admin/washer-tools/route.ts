import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOutstandingQuantity, getUsedQuantities, isReturnDue } from '@/lib/washerTools';
import { selectAll } from '@/lib/supabaseQuery';

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
    const toolType = searchParams.get('toolType');
    const isReturned = searchParams.get('isReturned');

    const buildQuery = () => {
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
        .order('assigned_date', { ascending: false })
        .order('id');

      if (washerId) {
        query = query.eq('washer_id', washerId);
      }

      if (toolType) {
        query = query.eq('tool_type', toolType);
      }

      if (isReturned !== null) {
        query = query.eq('is_returned', isReturned === 'true');
      }

      return query;
    };

    // Page through all rows; a single request is capped at 1000
    let tools: Awaited<ReturnType<typeof buildQuery>>['data'] = null;
    let error: unknown = null;
    try {
      tools = await selectAll(buildQuery);
    } catch (err) {
      error = err;
    }

    if (error) {
      console.error('Error fetching washer tools:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch washer tools' },
        { status: 500 }
      );
    }

    // Used = quantity consumed on completed check-ins
    const usedQuantities = await getUsedQuantities(supabaseAdmin, tools || []);

    // Transform the data to match the frontend interface
    const transformedTools = tools?.map(tool => {
      const usedQuantity = usedQuantities[tool.id] || 0;
      const returnedQuantity = tool.returned_quantity || 0;
      const chargedQuantity = tool.charged_quantity || 0;
      const outstandingQuantity = getOutstandingQuantity(tool, usedQuantity);
      const unitCost = tool.amount || 0;

      return {
        id: tool.id,
        washerId: tool.washer_id,
        washer: tool.washer,
        toolName: tool.tool_name,
        toolType: tool.tool_type,
        quantity: tool.quantity,
        returnedQuantity: returnedQuantity,
        usedQuantity: usedQuantity,
        chargedQuantity: chargedQuantity,
        outstandingQuantity: outstandingQuantity,
        unitCost: unitCost,
        outstandingValue: outstandingQuantity * unitCost,
        chargedValue: chargedQuantity * unitCost,
        isReturnDue: isReturnDue(tool.returned_date),
        assignedDate: tool.assigned_date,
        returnedDate: tool.returned_date,
        isReturned: tool.is_returned || outstandingQuantity === 0,
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
      price,
      assignedDate,
      expectedReturnDate
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

    // Check if tool exists and has sufficient quantity
    const { data: existingTool, error: toolError } = await supabaseAdmin
      .from('worker_tools')
      .select('id, amount')
      .eq('name', toolName)
      .single();

    if (toolError || !existingTool) {
      return NextResponse.json(
        { success: false, error: 'Tool not found' },
        { status: 404 }
      );
    }

    if (existingTool.amount < quantity) {
      return NextResponse.json(
        { success: false, error: `Insufficient quantity. Available: ${existingTool.amount}, Requested: ${quantity}` },
        { status: 400 }
      );
    }
    // Log received data
    console.log('Received data:', { washerId, toolId, toolName, toolType, quantity, price });

    // Determine the cost to use: provided price > worker_tools replacement cost
    let finalCost = 0;
    
    if (price && price > 0) {
      // Use the provided price
      finalCost = price;
    } else {
      // Get replacement cost from worker_tools table
      const { data: service, error: serviceError } = await supabaseAdmin
        .from('worker_tools')
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

    if (assignedDate) {
      insertData.assigned_date = assignedDate;
    }

    if (expectedReturnDate) {
      insertData.returned_date = expectedReturnDate;
    }

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
      console.error('Error creating washer tool:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create washer tool' },
        { status: 500 }
      );
    }

    // Reduce the available quantity in worker_tools table
    const { error: updateError } = await supabaseAdmin
      .from('worker_tools')
      .update({ amount: existingTool.amount - quantity })
      .eq('id', existingTool.id);

    if (updateError) {
      console.error('Error updating tool quantity:', updateError);
      return NextResponse.json(
        { success: false, error: 'Tool assigned but failed to update inventory' },
        { status: 500 }
      );
    }

    // Transform the response
    const transformedTool = {
      id: tool.id,
      washerId: tool.washer_id,
      washer: tool.washer,
      toolName: tool.tool_name,
      toolType: tool.tool_type,
      quantity: tool.quantity,
      assignedDate: tool.assigned_date,
      returnedDate: tool.returned_date,
      isReturned: tool.is_returned,
      notes: tool.notes,
      createdAt: tool.created_at,
      updatedAt: tool.updated_at
    };

    return NextResponse.json({
      success: true,
      tool: transformedTool,
      message: 'Washer tool assigned successfully'
    });

  } catch (error) {
    console.error('Create washer tool error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { 
      washerToolId, 
      returnedQuantity,
      isCumulative
    } = await request.json();

    // Validate required input
    if (!washerToolId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: washerToolId is required' },
        { status: 400 }
      );
    }

    // Get the washer tool details
    const { data: washerTool, error: fetchError } = await supabaseAdmin
      .from('washer_tools')
      .select('*')
      .eq('id', washerToolId)
      .single();

    if (fetchError || !washerTool) {
      return NextResponse.json(
        { success: false, error: 'Washer tool not found' },
        { status: 404 }
      );
    }

    // Items used on completed jobs or already charged to the washer can't be returned
    const usedQuantity = (await getUsedQuantities(supabaseAdmin, [washerTool]))[washerTool.id] || 0;

    // Validate returned quantity if provided
    if (returnedQuantity !== undefined) {
      if (returnedQuantity < 0) {
        return NextResponse.json(
          { success: false, error: 'Returned quantity must be greater than or equal to 0' },
          { status: 400 }
        );
      }

      const outstandingQuantity = getOutstandingQuantity(washerTool, usedQuantity);
      const otherAccounted = usedQuantity + (washerTool.charged_quantity || 0);

      if (isCumulative && returnedQuantity > outstandingQuantity) {
        return NextResponse.json(
          { success: false, error: `Cannot return more than ${outstandingQuantity} item(s) still with the washer` },
          { status: 400 }
        );
      }

      if (!isCumulative && returnedQuantity + otherAccounted > washerTool.quantity) {
        return NextResponse.json(
          { success: false, error: `Returned quantity must be between 0 and ${washerTool.quantity - otherAccounted}` },
          { status: 400 }
        );
      }
    }

    // Calculate new returned quantity
    const currentReturnedQuantity = washerTool.returned_quantity || 0;
    let newReturnedQuantity;
    
    if (returnedQuantity !== undefined) {
      if (isCumulative) {
        // Add to existing returned quantity
        newReturnedQuantity = currentReturnedQuantity + returnedQuantity;
      } else {
        // Replace with new returned quantity
        newReturnedQuantity = returnedQuantity;
      }
    } else {
      newReturnedQuantity = currentReturnedQuantity;
    }
    
    const isFullyReturned = getOutstandingQuantity(
      { ...washerTool, returned_quantity: newReturnedQuantity },
      usedQuantity
    ) === 0;

    // Update the washer tool status
    const updateData: {
      returned_quantity: number;
      is_returned: boolean;
      returned_date: string | null;
    } = {
      returned_quantity: newReturnedQuantity,
      is_returned: isFullyReturned,
      returned_date: isFullyReturned ? new Date().toISOString() : washerTool.returned_date
    };

    const { error: updateError } = await supabaseAdmin
      .from('washer_tools')
      .update(updateData)
      .eq('id', washerToolId);

    if (updateError) {
      console.error('Error updating washer tool:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update washer tool' },
        { status: 500 }
      );
    }

    // If there's a change in returned quantity, update the available quantity in worker_tools
    const quantityDifference = newReturnedQuantity - currentReturnedQuantity;
    if (quantityDifference !== 0) {
      // First get current amount
      const { data: currentTool, error: fetchToolError } = await supabaseAdmin
        .from('worker_tools')
        .select('amount')
        .eq('name', washerTool.tool_name)
        .single();

      if (fetchToolError || !currentTool) {
        console.error('Error fetching current tool quantity:', fetchToolError);
        return NextResponse.json(
          { success: false, error: 'Tool returned but failed to update inventory' },
          { status: 500 }
        );
      }

      const { error: quantityError } = await supabaseAdmin
        .from('worker_tools')
        .update({ 
          amount: currentTool.amount + quantityDifference
        })
        .eq('name', washerTool.tool_name);

      if (quantityError) {
        console.error('Error updating tool quantity:', quantityError);
        return NextResponse.json(
          { success: false, error: 'Tool returned but failed to update inventory' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Washer tool updated successfully'
    });

  } catch (error) {
    console.error('Update washer tool error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}




