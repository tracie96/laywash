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

interface MaterialAssignment {
  materialId: string;
  materialName: string;
  quantityUsed: number;
}

export async function POST(request: NextRequest) {
  try {
    const { checkInId, washerId, materials }: {
      checkInId: string;
      washerId: string;
      materials: MaterialAssignment[];
    } = await request.json();

    // Validate required input
    if (!checkInId || !washerId || !materials || !Array.isArray(materials)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: checkInId, washerId, and materials array are required' },
        { status: 400 }
      );
    }

    // Verify the check-in exists and belongs to the washer
    const { data: checkIn, error: checkInError } = await supabaseAdmin
      .from('car_check_ins')
      .select('id, assigned_washer_id, status')
      .eq('id', checkInId)
      .eq('assigned_washer_id', washerId)
      .single();

    if (checkInError || !checkIn) {
      return NextResponse.json(
        { success: false, error: 'Check-in not found or not assigned to this washer' },
        { status: 404 }
      );
    }

    // Verify the washer has access to these materials
    const materialIds = materials.map((m: MaterialAssignment) => m.materialId);
    const { data: washerMaterials, error: materialsError } = await supabaseAdmin
      .from('washer_tools')
      .select('id, quantity, tool_name')
      .eq('washer_id', washerId)
      .in('id', materialIds)
      .eq('is_returned', false);

    if (materialsError || !washerMaterials) {
      return NextResponse.json(
        { success: false, error: 'Failed to verify washer materials' },
        { status: 500 }
      );
    }

    // Check if materials have sufficient quantity
    for (const material of materials) {
      const washerMaterial = washerMaterials.find(wm => wm.id === material.materialId);
      if (!washerMaterial) {
        return NextResponse.json(
          { success: false, error: `Material ${material.materialName} not found in washer's assigned materials` },
          { status: 400 }
        );
      }
      if (washerMaterial.quantity < material.quantityUsed) {
        return NextResponse.json(
          { success: false, error: `Insufficient quantity for ${material.materialName}. Available: ${washerMaterial.quantity}, Requested: ${material.quantityUsed}` },
          { status: 400 }
        );
      }
    }

    // Insert check-in materials
    const checkInMaterials = materials.map((material: MaterialAssignment) => ({
      check_in_id: checkInId,
      washer_id: washerId,
      material_id: material.materialId,
      material_name: material.materialName,
      quantity_used: material.quantityUsed,
      amount: 0, // Default amount, can be updated later if needed
      usage_date: new Date().toISOString()
    }));

    console.log('Inserting check-in materials:', checkInMaterials);

    const { data: insertedMaterials, error: insertError } = await supabaseAdmin
      .from('check_in_materials')
      .insert(checkInMaterials)
      .select();

    if (insertError) {
      console.error('Error inserting check-in materials:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to assign materials to check-in' },
        { status: 500 }
      );
    }

    // Update washer material quantities (reduce available quantity)
    for (const material of materials) {
      // First get the current quantity
      const { data: currentMaterial, error: fetchError } = await supabaseAdmin
        .from('washer_tools')
        .select('quantity')
        .eq('id', material.materialId)
        .single();

      if (fetchError || !currentMaterial) {
        console.error('Error fetching current material quantity:', fetchError);
        continue;
      }

      const newQuantity = currentMaterial.quantity - material.quantityUsed;

      // Update with new quantity
      const { error: updateError } = await supabaseAdmin
        .from('washer_tools')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', material.materialId);

      if (updateError) {
        console.error('Error updating washer material quantity:', updateError);
        // Continue with other materials even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Materials assigned to check-in successfully',
      materials: insertedMaterials
    });

  } catch (error) {
    console.error('Assign materials error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkInId = searchParams.get('checkInId');
    const washerId = searchParams.get('washerId');

    if (!checkInId) {
      return NextResponse.json(
        { success: false, error: 'checkInId is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('check_in_materials')
      .select('*')
      .eq('check_in_id', checkInId)
      .order('usage_date', { ascending: false });

    if (washerId) {
      query = query.eq('washer_id', washerId);
    }

    const { data: materials, error } = await query;

    if (error) {
      console.error('Error fetching check-in materials:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch check-in materials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      materials: materials || []
    });

  } catch (error) {
    console.error('Fetch check-in materials error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
