import { NextResponse } from 'next/server';
import { LocationService } from '../../../../../lib/locationService';

// GET /api/admin/locations/lgas - Get all unique LGAs
export async function GET() {
  try {
    const lgas = await LocationService.getUniqueLGAs();
    
    return NextResponse.json({
      success: true,
      data: lgas
    });
  } catch (error) {
    console.error('Error fetching LGAs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch LGAs' },
      { status: 500 }
    );
  }
}

