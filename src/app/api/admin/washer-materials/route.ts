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
      .from('washer_materials')
      .select(`
        *,
        washer:users!washer_materials_washer_id_fkey (
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
      query = query.eq('material_type', materialType);
    }

    if (isReturned !== null) {
      query = query.eq('is_returned', isReturned === 'true');
    }

    const { data: materials, error } = await query;

    if (error) {
      console.error('Error fetching washer materials:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch washer materials' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedMaterials = materials?.map(material => ({
      id: material.id,
      washerId: material.washer_id,
      washer: material.washer,
      materialName: material.material_name,
      materialType: material.material_type,
      quantity: material.quantity,
      unit: material.unit,
      assignedDate: material.assigned_date,
      returnedQuantity: material.returned_quantity,
      isReturned: material.is_returned,
      notes: material.notes,
      createdAt: material.created_at,
      updatedAt: material.updated_at
    })) || [];

    return NextResponse.json({
      success: true,
      materials: transformedMaterials
    });

  } catch (error) {
    console.error('Fetch washer materials error:', error);
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
      materialName, 
      materialType, 
      quantity, 
      unit, 
      notes 
    } = await request.json();

    // Validate required input
    if (!washerId || !materialName || !materialType || !quantity || !unit) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: washerId, materialName, materialType, quantity, and unit are required' },
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

    // Insert new washer material
    const { data: material, error } = await supabaseAdmin
      .from('washer_materials')
      .insert({
        washer_id: washerId,
        material_name: materialName,
        material_type: materialType,
        quantity: quantity,
        unit: unit,
        notes: notes || null
      })
      .select(`
        *,
        washer:users!washer_materials_washer_id_fkey (
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

    // Transform the response
    const transformedMaterial = {
      id: material.id,
      washerId: material.washer_id,
      washer: material.washer,
      materialName: material.material_name,
      materialType: material.material_type,
      quantity: material.quantity,
      unit: material.unit,
      assignedDate: material.assigned_date,
      returnedQuantity: material.returned_quantity,
      isReturned: material.is_returned,
      notes: material.notes,
      createdAt: material.created_at,
      updatedAt: material.updated_at
    };

    return NextResponse.json({
      success: true,
      material: transformedMaterial,
      message: 'Washer material assigned successfully'
    });

  } catch (error) {
    console.error('Create washer material error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}




