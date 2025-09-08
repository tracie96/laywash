// Test script to manually test the earnings update API
const testEarningsUpdate = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/admin/check-ins/update-washer-earnings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkInId: '1dac63d4-e276-4e25-a329-e698ba8f9408', // Use the check-in ID from your logs
        washerId: '6a82a6d5-4e25-4c8b-9e4c-bc198824249f' // Use the washer ID from your logs
      }),
    });

    const result = await response.json();
    console.log('Test result:', result);
  } catch (error) {
    console.error('Test error:', error);
  }
};

// Run the test
testEarningsUpdate();

