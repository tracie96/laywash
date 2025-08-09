import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
//   auth: {
//     autoRefreshToken: false,
//     persistSession: false
//   }
// });

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // For now, return mock data since we don't have an inventory table yet
    // In a real implementation, you would query the inventory table
    const mockInventoryItems = [
      {
        id: '1',
        name: 'Car Wash Soap',
        category: 'Cleaning Supplies',
        currentStock: 25,
        minStockLevel: 10,
        maxStockLevel: 50,
        unit: 'Liters',
        price: 15.99,
        supplier: 'ABC Supplies',
        lastUpdated: new Date().toISOString(),
        lastRestocked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        totalValue: 399.75,
        isActive: true
      },
      {
        id: '2',
        name: 'Microfiber Towels',
        category: 'Cleaning Supplies',
        currentStock: 8,
        minStockLevel: 15,
        maxStockLevel: 100,
        unit: 'Pieces',
        price: 2.50,
        supplier: 'XYZ Textiles',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        lastRestocked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        totalValue: 20.00,
        isActive: true
      },
      {
        id: '3',
        name: 'Wax Polish',
        category: 'Finishing Products',
        currentStock: 12,
        minStockLevel: 5,
        maxStockLevel: 30,
        unit: 'Bottles',
        price: 8.99,
        supplier: 'Premium Products',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        lastRestocked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        totalValue: 107.88,
        isActive: true
      },
      {
        id: '4',
        name: 'Tire Shine',
        category: 'Finishing Products',
        currentStock: 18,
        minStockLevel: 8,
        maxStockLevel: 25,
        unit: 'Bottles',
        price: 6.50,
        supplier: 'Premium Products',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        lastRestocked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        totalValue: 117.00,
        isActive: true
      },
      {
        id: '5',
        name: 'Glass Cleaner',
        category: 'Cleaning Supplies',
        currentStock: 5,
        minStockLevel: 12,
        maxStockLevel: 40,
        unit: 'Bottles',
        price: 4.99,
        supplier: 'ABC Supplies',
        lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        lastRestocked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        totalValue: 24.95,
        isActive: true
      }
    ];

    // Apply search filter
    let filteredItems = mockInventoryItems;
    if (search) {
      filteredItems = filteredItems.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase()) ||
        item.supplier.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply category filter
    if (category !== 'all') {
      filteredItems = filteredItems.filter(item => item.category === category);
    }

    // Apply status filter
    if (status !== 'all') {
      filteredItems = filteredItems.filter(item => {
        const stockStatus = getStockStatus(item);
        return stockStatus === status;
      });
    }

    // Apply sorting
    filteredItems.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'currentStock':
          aValue = a.currentStock;
          bValue = b.currentStock;
          break;
        case 'totalValue':
          aValue = a.totalValue;
          bValue = b.totalValue;
          break;
        case 'lastUpdated':
          aValue = new Date(a.lastUpdated);
          bValue = new Date(b.lastUpdated);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

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

    // For now, return success with mock data
    // In a real implementation, you would insert into the inventory table
    const newItem = {
      id: Date.now().toString(),
      name,
      category,
      currentStock,
      minStockLevel,
      maxStockLevel,
      unit,
      price,
      supplier,
      lastUpdated: new Date().toISOString(),
      lastRestocked: new Date().toISOString(),
      totalValue: currentStock * price,
      isActive: true
    };

    return NextResponse.json({
      success: true,
      item: newItem
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
