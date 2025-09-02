import { NextRequest, NextResponse } from 'next/server';
import { LocationService } from '../../../../lib/locationService';
import { CreateLocationData } from '../../../../types/location';

// GET /api/admin/locations - Get all locations with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lga = searchParams.get('lga');
    const isActive = searchParams.get('is_active');
    const search = searchParams.get('search');

    const filters: Record<string, string | boolean | undefined> = {};
    if (lga) filters.lga = lga;
    if (isActive !== null) filters.is_active = isActive === 'true';
    if (search) filters.search = search;

    const locations = await LocationService.getLocations(filters);

    return NextResponse.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

// POST /api/admin/locations - Create a new location
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CreateLocationData = await request.json();
    
    // Validate required fields
    if (!body.address || !body.lga) {
      return NextResponse.json(
        { success: false, error: 'Address and LGA are required' },
        { status: 400 }
      );
    }

    const newLocation = await LocationService.createLocation(body);
    
    if (!newLocation) {
      return NextResponse.json(
        { success: false, error: 'Failed to create location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newLocation
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create location' },
      { status: 500 }
    );
  }
}

