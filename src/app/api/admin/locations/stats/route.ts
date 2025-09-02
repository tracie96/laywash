import { NextResponse } from 'next/server';
import { LocationService } from '../../../../../lib/locationService';

// GET /api/admin/locations/stats - Get location statistics
export async function GET() {
  try {
    const stats = await LocationService.getLocationStats();
    
    if (!stats) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch location statistics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching location stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch location statistics' },
      { status: 500 }
    );
  }
}

