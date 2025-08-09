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
    const status = searchParams.get('status') || 'all';
    const workerId = searchParams.get('workerId') || 'all';
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // For now, return mock data since we don't have a tool_charges table yet
    // In a real implementation, you would query the tool_charges table
    const mockCharges = [
      {
        id: "1",
        toolName: "Pressure Washer",
        workerName: "John Smith",
        workerId: "worker_1",
        chargeAmount: 500.00,
        reason: "Lost during shift",
        date: "2024-01-15",
        status: "pending",
        replacementCost: 500.00,
        notes: "Worker claims it was stolen from the work area",
        createdAt: new Date("2024-01-15").toISOString(),
        updatedAt: new Date("2024-01-15").toISOString()
      },
      {
        id: "2",
        toolName: "Scrub Brushes",
        workerName: "Sarah Johnson",
        workerId: "worker_2",
        chargeAmount: 15.00,
        reason: "Damaged beyond repair",
        date: "2024-01-14",
        status: "paid",
        replacementCost: 15.00,
        notes: "Brushes worn out from heavy use",
        createdAt: new Date("2024-01-14").toISOString(),
        updatedAt: new Date("2024-01-14").toISOString()
      },
      {
        id: "3",
        toolName: "Vacuum Cleaner",
        workerName: "Mike Davis",
        workerId: "worker_3",
        chargeAmount: 300.00,
        reason: "Lost tool",
        date: "2024-01-10",
        status: "disputed",
        replacementCost: 300.00,
        notes: "Worker disputes the charge, claims it was returned",
        createdAt: new Date("2024-01-10").toISOString(),
        updatedAt: new Date("2024-01-10").toISOString()
      },
      {
        id: "4",
        toolName: "Steam Cleaner",
        workerName: "Alex Wilson",
        workerId: "worker_4",
        chargeAmount: 800.00,
        reason: "Damaged during use",
        date: "2024-01-08",
        status: "pending",
        replacementCost: 800.00,
        notes: "Equipment malfunctioned during operation",
        createdAt: new Date("2024-01-08").toISOString(),
        updatedAt: new Date("2024-01-08").toISOString()
      },
      {
        id: "5",
        toolName: "Detailing Kit",
        workerName: "Emma Brown",
        workerId: "worker_5",
        chargeAmount: 150.00,
        reason: "Lost during transport",
        date: "2024-01-05",
        status: "paid",
        replacementCost: 150.00,
        notes: "Kit was left behind at customer location",
        createdAt: new Date("2024-01-05").toISOString(),
        updatedAt: new Date("2024-01-05").toISOString()
      }
    ];

    // Apply search filter
    let filteredCharges = mockCharges;
    if (search) {
      filteredCharges = filteredCharges.filter(charge => 
        charge.toolName.toLowerCase().includes(search.toLowerCase()) ||
        charge.workerName.toLowerCase().includes(search.toLowerCase()) ||
        charge.reason.toLowerCase().includes(search.toLowerCase()) ||
        charge.notes.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (status !== 'all') {
      filteredCharges = filteredCharges.filter(charge => charge.status === status);
    }

    // Apply worker filter
    if (workerId !== 'all') {
      filteredCharges = filteredCharges.filter(charge => charge.workerId === workerId);
    }

    // Apply sorting
    filteredCharges.sort((a, b) => {
      let aValue;
      let bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'chargeAmount':
          aValue = a.chargeAmount;
          bValue = b.chargeAmount;
          break;
        case 'toolName':
          aValue = a.toolName.toLowerCase();
          bValue = b.toolName.toLowerCase();
          break;
        case 'workerName':
          aValue = a.workerName.toLowerCase();
          bValue = b.workerName.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return NextResponse.json({
      success: true,
      charges: filteredCharges
    });

  } catch (error) {
    console.error('Fetch tool charges error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      toolName, 
      workerId, 
      workerName, 
      chargeAmount, 
      reason, 
      replacementCost, 
      notes 
    } = await request.json();

    // Validate required input
    if (!toolName || !workerId || !workerName || !chargeAmount || !reason || !replacementCost) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (chargeAmount < 0 || replacementCost < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid numeric values' },
        { status: 400 }
      );
    }

    // For now, return success with mock data
    // In a real implementation, you would insert into the tool_charges table
    const newCharge = {
      id: Date.now().toString(),
      toolName,
      workerId,
      workerName,
      chargeAmount,
      reason,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      replacementCost,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      charge: newCharge
    });

  } catch (error) {
    console.error('Create tool charge error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
