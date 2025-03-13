import { mockApi } from './mockData.ts';

async function testTrading() {
  console.log('Initial state:');
  console.log('Orders:', await mockApi.getOrders());
  console.log('Trades:', await mockApi.getTrades());

  console.log('\nCreating some sell orders for liquidity:');
  await mockApi.createOrder({
    type: 'LIMIT',
    originalType: 'LIMIT',
    side: 'SELL',
    quantity: 100,
    price: 100,
    isUserInput: false,
    executedPrice: undefined
  });
  
  await mockApi.createOrder({
    type: 'LIMIT',
    originalType: 'LIMIT',
    side: 'SELL',
    quantity: 100,
    price: 101,
    isUserInput: false,
    executedPrice: undefined
  });

  console.log('\nPlacing market buy order for 150:');
  await mockApi.createOrder({
    type: 'MARKET',
    originalType: 'MARKET',
    side: 'BUY',
    quantity: 150,
    price: 0,
    isUserInput: true,
    executedPrice: undefined
  });

  console.log('\nFinal state:');
  console.log('Orders:', await mockApi.getOrders());
  console.log('Trades:', await mockApi.getTrades());
}

testTrading().catch(console.error); 