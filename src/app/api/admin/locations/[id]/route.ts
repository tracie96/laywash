import { NextRequest, NextResponse } from 'next/server';
import { LocationService } from '../../../../../lib/locationService';
import { UpdateLocationData } from '../../../../../types/location';

// GET /api/admin/locations/[id] - Get a specific location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const location = await LocationService.getLocationById(id);
    
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/locations/[id] - Update a location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body: UpdateLocationData = await request.json();
    
    // Validate that at least one field is provided
    if (!body.address && !body.lga && body.is_active === undefined) {
      return NextResponse.json(
        { success: false, error: 'At least one field must be provided for update' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const updatedLocation = await LocationService.updateLocation(id, body);
    
    if (!updatedLocation) {
      return NextResponse.json(
        { success: false, error: 'Failed to update location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedLocation
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/locations/[id] - Delete (deactivate) a location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
      const { id } = await params;
    const success = await LocationService.deleteLocation(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Location deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete location' },
      { status: 500 }
    );
  }
}

