// Test script to manually test the payment update API
const testPaymentUpdate = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/admin/check-ins/1dac63d4-e276-4e25-a329-e698ba8f9408', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentStatus: 'paid',
        paymentMethod: 'cash'
      }),
    });

    const result = await response.json();
    console.log('Test result:', result);
  } catch (error) {
    console.error('Test error:', error);
  }
};

// Run the test
testPaymentUpdate();

