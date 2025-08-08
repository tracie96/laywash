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

    // For now, return mock data since we don't have a tools table yet
    // In a real implementation, you would query the tools table
    const mockTools = [
      {
        id: "1",
        name: "Pressure Washer",
        description: "High-pressure water cleaning equipment",
        category: "Equipment",
        isReturnable: true,
        replacementCost: 500.00,
        totalQuantity: 5,
        availableQuantity: 3,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "2",
        name: "Scrub Brushes",
        description: "Various cleaning brushes for different surfaces",
        category: "Tools",
        isReturnable: false,
        replacementCost: 15.00,
        totalQuantity: 20,
        availableQuantity: 18,
        isActive: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        id: "3",
        name: "Vacuum Cleaner",
        description: "Industrial vacuum for interior cleaning",
        category: "Equipment",
        isReturnable: true,
        replacementCost: 300.00,
        totalQuantity: 3,
        availableQuantity: 2,
        isActive: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
      },
      {
        id: "4",
        name: "Microfiber Cloths",
        description: "High-quality cleaning cloths",
        category: "Supplies",
        isReturnable: false,
        replacementCost: 5.00,
        totalQuantity: 100,
        availableQuantity: 75,
        isActive: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
      },
      {
        id: "5",
        name: "Steam Cleaner",
        description: "Professional steam cleaning equipment",
        category: "Equipment",
        isReturnable: true,
        replacementCost: 800.00,
        totalQuantity: 2,
        availableQuantity: 1,
        isActive: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
      },
      {
        id: "6",
        name: "Detailing Kit",
        description: "Complete car detailing kit with various tools",
        category: "Tools",
        isReturnable: true,
        replacementCost: 150.00,
        totalQuantity: 8,
        availableQuantity: 6,
        isActive: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
      }
    ];

    // Apply search filter
    let filteredTools = mockTools;
    if (search) {
      filteredTools = filteredTools.filter(tool => 
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.description.toLowerCase().includes(search.toLowerCase()) ||
        tool.category.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply category filter
    if (category !== 'all') {
      filteredTools = filteredTools.filter(tool => tool.category === category);
    }

    // Apply status filter
    if (status !== 'all') {
      filteredTools = filteredTools.filter(tool => {
        if (status === 'active') return tool.isActive;
        if (status === 'inactive') return !tool.isActive;
        if (status === 'low_availability') return (tool.availableQuantity / tool.totalQuantity) < 0.3;
        if (status === 'out_of_stock') return tool.availableQuantity === 0;
        return true;
      });
    }

    // Apply sorting
    filteredTools.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'replacementCost':
          aValue = a.replacementCost;
          bValue = b.replacementCost;
          break;
        case 'availableQuantity':
          aValue = a.availableQuantity;
          bValue = b.availableQuantity;
          break;
        case 'totalQuantity':
          aValue = a.totalQuantity;
          bValue = b.totalQuantity;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
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
      totalQuantity, 
      availableQuantity 
    } = await request.json();

    // Validate required input
    if (!name || !description || !category || replacementCost === undefined || totalQuantity === undefined || availableQuantity === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (replacementCost < 0 || totalQuantity < 0 || availableQuantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid numeric values' },
        { status: 400 }
      );
    }

    if (availableQuantity > totalQuantity) {
      return NextResponse.json(
        { success: false, error: 'Available quantity cannot exceed total quantity' },
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

    // For now, return success with mock data
    // In a real implementation, you would insert into the tools table
    const newTool = {
      id: Date.now().toString(),
      name,
      description,
      category,
      isReturnable: isReturnable || false,
      replacementCost,
      totalQuantity,
      availableQuantity,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      tool: newTool
    });

  } catch (error) {
    console.error('Create tool error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
