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

export async function POST(request: NextRequest) {
  try {
    const { checkInId, washerId } = await request.json();

    if (!checkInId || !washerId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: checkInId and washerId' },
        { status: 400 }
      );
    }

    // Get the check-in with services and their commission percentages
    const { data: checkInData, error: checkInError } = await supabaseAdmin
      .from('car_check_ins')
      .select(`
        id,
        check_in_services (
          id,
          service_id,
          price
        )
      `)
      .eq('id', checkInId)
      .single();

    if (checkInError) {
      console.error('Error fetching check-in data:', checkInError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch check-in data' },
        { status: 500 }
      );
    }

    if (!checkInData?.check_in_services || checkInData.check_in_services.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No check-in services found' },
        { status: 404 }
      );
    }

    // Get services data separately to debug the relationship
    const serviceIds = checkInData.check_in_services.map(cis => cis.service_id);

    const { data: servicesData, error: servicesError } = await supabaseAdmin
      .from('services')
      .select('id, name, washer_commission_percentage, company_commission_percentage')
      .in('id', serviceIds);

    if (servicesError) {
      console.error('Error fetching services data:', servicesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch services data' },
        { status: 500 }
      );
    }


    // Calculate total earnings for the washer and company income
    let totalEarnings = 0;
    let totalCompanyIncome = 0;
        
    for (const checkInService of checkInData.check_in_services) {
      
      const service = servicesData.find(s => s.id === checkInService.service_id);
      
      if (service && service.washer_commission_percentage && checkInService.price) {
        const commission = (checkInService.price * service.washer_commission_percentage) / 100;
        totalEarnings += commission;
        console.log(`Service: ${service.id}, Price: ${checkInService.price}, Commission: ${service.washer_commission_percentage}%, Earnings: ${commission}`);
      } else {
        console.log('Service data missing required fields:', {
          hasService: !!service,
          hasCommission: !!service?.washer_commission_percentage,
          hasPrice: !!checkInService.price,
          serviceId: service?.id,
          commission: service?.washer_commission_percentage,
          price: checkInService.price
        });
      }

      if (service && service.company_commission_percentage && checkInService.price) {
        const companyIncome = (checkInService.price * service.company_commission_percentage) / 100;
        totalCompanyIncome += companyIncome;
      }
    }

    if (totalEarnings === 0) {
      console.warn('No earnings calculated for washer:', washerId);
      return NextResponse.json(
        { success: false, error: 'No earnings calculated' },
        { status: 400 }
      );
    }

    // First, get the current total earnings
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('car_washer_profiles')
      .select('total_earnings')
      .eq('user_id', washerId)
      .single();

    if (fetchError) {
      console.error('Error fetching current washer profile:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch washer profile' },
        { status: 500 }
      );
    }

    // Calculate new total earnings
    const currentEarnings = currentProfile?.total_earnings || 0;
    const newTotalEarnings = currentEarnings + totalEarnings;

    // Update the washer's total earnings in car_washer_profile
    const { error: updateError } = await supabaseAdmin
      .from('car_washer_profiles')
      .update({
        total_earnings: newTotalEarnings,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', washerId);

    if (updateError) {
      console.error('Error updating washer earnings:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update washer earnings' },
        { status: 500 }
      );
    }

    // Update the company_income field in car_check_ins table
    const { error: companyIncomeUpdateError } = await supabaseAdmin
      .from('car_check_ins')
      .update({
        company_income: totalCompanyIncome,
        updated_at: new Date().toISOString()
      })
      .eq('id', checkInId);

    if (companyIncomeUpdateError) {
      console.error('Error updating company income:', companyIncomeUpdateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update company income' },
        { status: 500 }
      );
    }

    console.log(`Updated washer ${washerId} earnings by ${totalEarnings}`);
    console.log(`Updated company income for check-in ${checkInId} to ${totalCompanyIncome}`);

    return NextResponse.json({
      success: true,
      message: 'Washer earnings and company income updated successfully',
      earningsAdded: totalEarnings,
      companyIncome: totalCompanyIncome
    });

  } catch (error) {
    console.error('Update washer earnings error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
