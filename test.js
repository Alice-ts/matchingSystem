import { mockApi } from './src/services/mockData.ts';

async function testMatching() {
  // Clear existing orders
  const currentOrders = await mockApi.getOrders();
  for (const order of currentOrders) {
    await mockApi.deleteOrder(order.id);
  }

  // Test scenario 1: LIMIT orders with same quantity
  console.log('\nTest 1: LIMIT orders with same quantity');
  await mockApi.createOrder({
    type: 'LIMIT',
    originalType: 'LIMIT',
    side: 'SELL',
    quantity: 50,
    price: 100
  });
  await mockApi.createOrder({
    type: 'LIMIT',
    originalType: 'LIMIT',
    side: 'BUY',
    quantity: 50,
    price: 100
  });

  // Test scenario 2: MARKET order matching with LIMIT
  console.log('\nTest 2: MARKET order matching with LIMIT');
  await mockApi.createOrder({
    type: 'LIMIT',
    originalType: 'LIMIT',
    side: 'SELL',
    quantity: 75,
    price: 150
  });
  await mockApi.createOrder({
    type: 'MARKET',
    originalType: 'MARKET',
    side: 'BUY',
    quantity: 75,
    price: 0
  });

  // Test scenario 3: PEGGED order matching
  console.log('\nTest 3: PEGGED order matching');
  await mockApi.createOrder({
    type: 'LIMIT',
    originalType: 'LIMIT',
    side: 'SELL',
    quantity: 100,
    price: 200
  });
  await mockApi.createOrder({
    type: 'LIMIT',
    originalType: 'PEGGED',
    side: 'BUY',
    quantity: 100,
    price: 200
  });

  console.log('\nFinal trades:');
  const trades = await mockApi.getTrades();
  console.log(trades);
}

testMatching().catch(console.error); 