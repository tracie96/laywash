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
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build the query
    let query = supabaseAdmin
      .from('services')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply category filter
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('is_active', status === 'active');
    }

    const { data: services, error } = await query;

    if (error) {
      console.error('Error fetching services:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch services' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedServices = services?.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description || '',
      price: service.base_price,
      duration: service.estimated_duration,
      category: service.category,
      washerCommissionPercentage: service.washer_commission_percentage,
      companyCommissionPercentage: service.company_commission_percentage,
      maxWashersPerService: service.max_washers_per_service,
      commissionNotes: service.commission_notes || '',
      isActive: service.is_active,
      popularity: calculatePopularity(service), // This would need to be calculated based on usage
      createdAt: service.created_at,
      updatedAt: service.updated_at
    })) || [];

    return NextResponse.json({
      success: true,
      services: transformedServices
    });

  } catch (error) {
    console.error('Fetch services error:', error);
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
      price, 
      category, 
      duration,
      washerCommissionPercentage = 40,
      companyCommissionPercentage = 60,
      maxWashersPerService = 2,
      commissionNotes = ''
    } = await request.json();

    // Validate required input
    if (!name || !category || !duration) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, category, and duration are required' },
        { status: 400 }
      );
    }

    // Validate commission percentages
    if (washerCommissionPercentage + companyCommissionPercentage !== 100) {
      return NextResponse.json(
        { success: false, error: 'Washer and company commission percentages must equal 100%' },
        { status: 400 }
      );
    }

    if (washerCommissionPercentage < 0 || washerCommissionPercentage > 100) {
      return NextResponse.json(
        { success: false, error: 'Washer commission percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (maxWashersPerService < 1) {
      return NextResponse.json(
        { success: false, error: 'Maximum washers per service must be at least 1' },
        { status: 400 }
      );
    }

    // // Validate price
    // if (price <= 0) {
    //   return NextResponse.json(
    //     { success: false, error: 'Price must be greater than 0' },
    //     { status: 400 }
    //   );
    // }

    // Validate duration
    if (duration <= 0) {
      return NextResponse.json(
        { success: false, error: 'Duration must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['exterior', 'interior', 'engine', 'vacuum', 'complementary'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category. Must be one of: exterior, interior, engine, vacuum, complementary' },
        { status: 400 }
      );
    }

    // Check if service with same name already exists
    const { data: existingService, error: checkError } = await supabaseAdmin
      .from('services')
      .select('id, name')
      .eq('name', name)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      return NextResponse.json(
        { success: false, error: 'Error checking for existing service' },
        { status: 500 }
      );
    }

    if (existingService) {
      return NextResponse.json(
        { success: false, error: `Service with name "${name}" already exists` },
        { status: 400 }
      );
    }

    // Create service in the database
    const { data: service, error: insertError } = await supabaseAdmin
      .from('services')
      .insert({
        name,
        description: description || null,
        base_price: price,
        category,
        estimated_duration: duration,
        washer_commission_percentage: washerCommissionPercentage,
        company_commission_percentage: companyCommissionPercentage,
        max_washers_per_service: maxWashersPerService,
        commission_notes: commissionNotes || null,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Create service error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create service' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      service: {
        id: service.id,
        name: service.name,
        description: service.description || '',
        price: service.base_price,
        duration: service.estimated_duration,
        category: service.category,
        washerCommissionPercentage: service.washer_commission_percentage,
        companyCommissionPercentage: service.company_commission_percentage,
        maxWashersPerService: service.max_washers_per_service,
        commissionNotes: service.commission_notes || '',
        isActive: service.is_active,
        createdAt: service.created_at,
        updatedAt: service.updated_at
      }
    });

  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to calculate service popularity (placeholder implementation)
function calculatePopularity(service: { id: string }): number {
  console.log('service', service);
  // This would typically be calculated based on:
  // - Number of times the service has been selected
  // - Revenue generated from the service
  // - Customer ratings/feedback
  // For now, return a random value between 50-95
  return Math.floor(Math.random() * 45) + 50;
}
