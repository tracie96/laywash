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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData = await request.json();

    // Validate the update data
    if (updateData.price !== undefined && updateData.price <= 0) {
      return NextResponse.json(
        { success: false, error: 'Price must be greater than 0' },
        { status: 400 }
      );
    }

    if (updateData.duration !== undefined && updateData.duration <= 0) {
      return NextResponse.json(
        { success: false, error: 'Duration must be greater than 0' },
        { status: 400 }
      );
    }

    if (updateData.category !== undefined) {
      const validCategories = ['exterior', 'interior', 'engine', 'vacuum', 'complementary'];
      if (!validCategories.includes(updateData.category)) {
        return NextResponse.json(
          { success: false, error: 'Invalid category' },
          { status: 400 }
        );
      }
    }

    // Transform frontend field names to database field names
    const dbUpdateData: { name?: string; description?: string; base_price?: number; estimated_duration?: number; category?: string; is_active?: boolean } = {};
    if (updateData.name !== undefined) dbUpdateData.name = updateData.name;
    if (updateData.description !== undefined) dbUpdateData.description = updateData.description;
    if (updateData.price !== undefined) dbUpdateData.base_price = updateData.price;
    if (updateData.duration !== undefined) dbUpdateData.estimated_duration = updateData.duration;
    if (updateData.category !== undefined) dbUpdateData.category = updateData.category;
    if (updateData.isActive !== undefined) dbUpdateData.is_active = updateData.isActive;

    // Update the service
    const { data: service, error } = await supabaseAdmin
      .from('services')
      .update(dbUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update service error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update service' },
        { status: 500 }
      );
    }

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
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
        isActive: service.is_active,
        createdAt: service.created_at,
        updatedAt: service.updated_at
      }
    });

  } catch (error) {
    console.error('Update service error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if service exists
    const { error: checkError } = await supabaseAdmin
      .from('services')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    // Check if service is being used in any check-ins
    const { data: checkIns, error: usageError } = await supabaseAdmin
      .from('check_in_services')
      .select('id')
      .eq('service_id', id)
      .limit(1);

    if (usageError) {
      console.error('Error checking service usage:', usageError);
    }

    if (checkIns && checkIns.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete service that is being used in check-ins. Consider deactivating it instead.' },
        { status: 400 }
      );
    }

    // Delete the service
    const { error } = await supabaseAdmin
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete service error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete service' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
