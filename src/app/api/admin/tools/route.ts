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
    const category = searchParams.get('category') || 'all';
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Query the worker_tools table
    let query = supabaseAdmin
      .from('worker_tools')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply filters
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        query = query.eq('is_active', true);
      } else if (status === 'inactive') {
        query = query.eq('is_active', false);
      }
    }

    const { data: tools, error } = await query;

    if (error) {
      console.error('Error fetching tools:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tools' },
        { status: 500 }
      );
    }
    // Transform the data to match the frontend interface
    const transformedTools = tools?.map(tool => ({
      id: tool.id,
      name: tool.name,
      description: tool.description || '',
      category: tool.category || 'General',
      isReturnable: tool.is_returnable || false,
      replacementCost: tool.replacement_cost || 0,
      amount: tool.amount || 0,
      isActive: tool.is_active || false,
      createdAt: tool.created_at,
      updatedAt: tool.updated_at
    })) || [];

    // Apply additional filters that can't be done at database level
    let filteredTools = transformedTools;
    if (status === 'low_availability') {
      filteredTools = filteredTools.filter(tool => tool.amount < 3);
    } else if (status === 'out_of_stock') {
      filteredTools = filteredTools.filter(tool => tool.amount === 0);
    }

    return NextResponse.json({
      success: true,
      tools: filteredTools
    });

  } catch (error) {
    console.error('Fetch tools error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      description, 
      category, 
      isReturnable, 
      replacementCost, 
      amount 
    } = await request.json();

    // Validate required input
    if (!name || !description || !category || replacementCost === undefined || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (replacementCost < 0 || amount < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid numeric values' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['Equipment', 'Tools', 'Supplies'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category. Must be one of: Equipment, Tools, Supplies' },
        { status: 400 }
      );
    }

    // Insert new tool into the worker_tools table
    const { data: newTool, error } = await supabaseAdmin
      .from('worker_tools')
      .insert({
        name,
        description,
        category,
        is_returnable: isReturnable || false,
        replacement_cost: replacementCost,
        amount: amount,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tool:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create tool' },
        { status: 500 }
      );
    }

    // Transform the response to match the frontend interface
    const transformedTool = {
      id: newTool.id,
      name: newTool.name,
      description: newTool.description || '',
      category: newTool.category || 'General',
      isReturnable: newTool.is_returnable || false,
      replacementCost: newTool.replacement_cost || 0,
      amount: newTool.amount || 0,
      isActive: newTool.is_active || false,
      createdAt: newTool.created_at,
      updatedAt: newTool.updated_at
    };

    return NextResponse.json({
      success: true,
      tool: transformedTool,
      message: 'Tool created successfully'
    });

  } catch (error) {
    console.error('Create tool error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
