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
    // For now, skip complex authentication to get the system working
    // In production, this should be properly authenticated

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build the query using the inventory table with correct field names
    let query = supabaseAdmin
      .from('inventory')
      .select('*');

    // Apply search filter
    if (search) {
      try {
        query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,supplier.ilike.%${search}%`);
      } catch (filterError) {
        console.error('Search filter error:', filterError);
        // Continue without search filter if it fails
      }
    }

    // Apply category filter
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    // Apply sorting - map frontend field names to actual database field names
    let dbSortColumn = 'name';
    if (sortBy === 'currentStock') dbSortColumn = 'current_stock';
    else if (sortBy === 'lastUpdated') dbSortColumn = 'updated_at';
    else if (['name', 'category'].includes(sortBy)) dbSortColumn = sortBy;
    
    query = query.order(dbSortColumn, { ascending: sortOrder === 'asc' });

    const { data: inventory, error } = await query;
    
    console.log('Query result:', { data: inventory?.length, error }); // Debug: log results
    
    if (error) {
      console.error('Database error details:', error);
    }

    if (error) {
      console.error('Error fetching inventory:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch inventory' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface using correct field names
    const transformedItems = inventory?.map(item => ({
      id: item.id,
      name: item.name || 'Unknown Item',
      category: item.category || 'General',
      currentStock: item.current_stock || 0,
      minStockLevel: item.min_stock_level || 0,
      maxStockLevel: item.max_stock_level || 0,
      unit: item.unit || 'units',
      price: item.cost_per_unit || 0,
      supplier: item.supplier || 'Unknown',
      lastUpdated: item.updated_at || item.created_at || new Date().toISOString(),
      lastRestocked: item.updated_at || item.created_at || new Date().toISOString(),
      totalValue: (item.current_stock || 0) * (item.cost_per_unit || 0),
      isActive: item.is_active || true
    })) || [];

    // Apply status filter after transformation
    let filteredItems = transformedItems;
    if (status !== 'all') {
      filteredItems = filteredItems.filter(item => {
        const stockStatus = getStockStatus(item);
        return stockStatus === status;
      });
    }

    return NextResponse.json({
      success: true,
      inventory: filteredItems
    });

  } catch (error) {
    console.error('Fetch inventory error:', error);
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
      category, 
      currentStock, 
      minStockLevel, 
      maxStockLevel, 
      unit, 
      price, 
      supplier 
    } = await request.json();

    // Validate required input
    if (!name || !category || currentStock === undefined || !minStockLevel || !maxStockLevel || !unit || !price || !supplier) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (currentStock < 0 || minStockLevel < 0 || maxStockLevel < 0 || price <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid numeric values' },
        { status: 400 }
      );
    }

    if (minStockLevel >= maxStockLevel) {
      return NextResponse.json(
        { success: false, error: 'Minimum stock level must be less than maximum stock level' },
        { status: 400 }
      );
    }

    // Insert into the inventory table using correct field names from your schema
    const { data: newItem, error: insertError } = await supabaseAdmin
      .from('inventory')
      .insert([{
        name,
        description: '', // Add description field
        category,
        current_stock: currentStock,
        min_stock_level: minStockLevel,
        max_stock_level: maxStockLevel,
        unit,
        cost_per_unit: price,
        supplier,
        is_active: true,
        quantity: currentStock, // Set quantity to match current_stock initially
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating inventory item:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create inventory item' },
        { status: 500 }
      );
    }

    // Transform the response to match frontend interface
    const transformedItem = {
      id: newItem.id,
      name: newItem.name,
      category: newItem.category,
      currentStock: newItem.current_stock,
      minStockLevel: newItem.min_stock_level,
      maxStockLevel: newItem.max_stock_level,
      unit: newItem.unit,
      price: newItem.cost_per_unit,
      supplier: newItem.supplier,
      lastUpdated: newItem.updated_at,
      lastRestocked: newItem.updated_at,
      totalValue: newItem.current_stock * newItem.cost_per_unit,
      isActive: newItem.is_active
    };

    return NextResponse.json({
      success: true,
      item: transformedItem
    });

  } catch (error) {
    console.error('Create inventory item error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to determine stock status
function getStockStatus(item: { currentStock: number; minStockLevel: number }): string {
  if (item.currentStock <= item.minStockLevel) return 'low';
  if (item.currentStock <= item.minStockLevel * 2) return 'medium';
  return 'good';
}
