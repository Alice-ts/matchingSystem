export type OrderType = 'LIMIT' | 'MARKET' | 'PEGGED';
export type ApiOrderType = 'LIMIT' | 'MARKET' | 'PEGGED';
export type OrderSide = 'BUY' | 'SELL';

export interface Order {
  id: number;
  type: ApiOrderType;
  originalType: OrderType | undefined;
  side: OrderSide;
  quantity: number;
  filledQuantity: number;  // Track how much of the order has been filled
  price: number;
  isUserInput: boolean;
  createdAt: string;
  executedPrice: number | undefined;
}

export interface Trade {
  buyId: number;
  sellId: number;
  quantity: number;
  executedPrice: number;
}

// Initial mock data
let orders: Order[] = [
  {
    id: 1,
    type: 'LIMIT',
    originalType: 'LIMIT',
    side: 'BUY',
    quantity: 100,
    filledQuantity: 0,
    price: 150.50,
    isUserInput: true,
    createdAt: new Date().toISOString(),
    executedPrice: undefined
  },
  {
    id: 2,
    type: 'LIMIT',
    originalType: 'LIMIT',
    side: 'SELL',
    quantity: 75,
    filledQuantity: 0,
    price: 151.00,
    isUserInput: true,
    createdAt: new Date().toISOString(),
    executedPrice: undefined
  },
  {
    id: 3,
    type: 'LIMIT',
    originalType: 'LIMIT',
    side: 'BUY',
    quantity: 75,
    filledQuantity: 0,
    price: 148.75,
    isUserInput: true,
    createdAt: new Date().toISOString(),
    executedPrice: undefined
  }
];

const trades: Trade[] = [];

let nextId = Math.max(...orders.map(o => o.id), 0) + 1;

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to match orders and create trades
function matchOrders(ordersToMatch: Order[]): { matched: boolean; order: Order | null } {
  let hasMatches = true;
  let result = { matched: false, order: null as Order | null };
  let matchedOrders = new Set<number>();

  while (hasMatches) {
    hasMatches = false;
    
    // Only look at orders that have remaining quantity to fill
    const buyOrders = ordersToMatch
      .filter(o => o.side === 'BUY' && o.quantity > o.filledQuantity && !matchedOrders.has(o.id))
      .sort((a, b) => {
        // First sort by price (highest first for buy orders)
        const priceDiff = b.price - a.price;
        // If prices are equal, sort by creation time (oldest first)
        return priceDiff !== 0 ? priceDiff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    
    const sellOrders = ordersToMatch
      .filter(o => o.side === 'SELL' && o.quantity > o.filledQuantity && !matchedOrders.has(o.id))
      .sort((a, b) => {
        // First sort by price (lowest first for sell orders)
        const priceDiff = a.price - b.price;
        // If prices are equal, sort by creation time (oldest first)
        return priceDiff !== 0 ? priceDiff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    if (buyOrders.length === 0 || sellOrders.length === 0) {
      break;
    }

    // First handle market orders
    const marketBuyOrder = buyOrders.find(o => o.type === 'MARKET');
    const marketSellOrder = sellOrders.find(o => o.type === 'MARKET');

    if (marketBuyOrder) {
      let totalMatchedQuantity = 0;
      let weightedPrice = 0;
      let remainingQuantity = marketBuyOrder.quantity - marketBuyOrder.filledQuantity;

      // Match against sell orders until fully filled or no more matches
      for (const sellOrder of sellOrders) {
        if (remainingQuantity <= 0) break;
        if (matchedOrders.has(sellOrder.id)) continue;
        
        const availableToSell = sellOrder.quantity - sellOrder.filledQuantity;
        if (availableToSell <= 0) continue;

        // Match as much as we can with this order
        const matchQuantity = Math.min(remainingQuantity, availableToSell);
        const executedPrice = sellOrder.price;

        // Create and record the trade
        const newTrade: Trade = {
          buyId: marketBuyOrder.id,
          sellId: sellOrder.id,
          quantity: matchQuantity,
          executedPrice
        };
        trades.push(newTrade);

        // Only mark orders as matched if they are completely filled
        if (sellOrder.filledQuantity + matchQuantity >= sellOrder.quantity) {
          matchedOrders.add(sellOrder.id);
        }
        if (marketBuyOrder.filledQuantity + matchQuantity >= marketBuyOrder.quantity) {
          matchedOrders.add(marketBuyOrder.id);
        }

        // Update both orders
        ordersToMatch = ordersToMatch.map(o => {
          if (o.id === sellOrder.id) {
            const newFilledQty = o.filledQuantity + matchQuantity;
            return {
              ...o,
              filledQuantity: newFilledQty,
              executedPrice: newFilledQty === o.quantity ? executedPrice : undefined
            };
          }
          if (o.id === marketBuyOrder.id) {
            const newFilledQty = o.filledQuantity + matchQuantity;
            return {
              ...o,
              filledQuantity: newFilledQty,
              executedPrice: newFilledQty === o.quantity ? executedPrice : undefined
            };
          }
          return o;
        });

        // Update running totals
        weightedPrice += executedPrice * matchQuantity;
        totalMatchedQuantity += matchQuantity;
        remainingQuantity -= matchQuantity;
        hasMatches = true;
      }

      // If we matched anything, record the result
      if (totalMatchedQuantity > 0) {
        const avgExecutedPrice = weightedPrice / totalMatchedQuantity;
        result = {
          matched: true,
          order: {
            ...marketBuyOrder,
            quantity: marketBuyOrder.quantity,
            filledQuantity: marketBuyOrder.filledQuantity + totalMatchedQuantity,
            executedPrice: (marketBuyOrder.filledQuantity + totalMatchedQuantity) === marketBuyOrder.quantity ? avgExecutedPrice : undefined
          }
        };
      }
    }

    if (marketSellOrder) {
      let totalMatchedQuantity = 0;
      let weightedPrice = 0;
      let remainingQuantity = marketSellOrder.quantity - marketSellOrder.filledQuantity;

      // Match against buy orders until fully filled or no more matches
      for (const buyOrder of buyOrders) {
        if (remainingQuantity <= 0 || matchedOrders.has(buyOrder.id)) break;
        
        const availableToBuy = buyOrder.quantity - buyOrder.filledQuantity;
        if (availableToBuy <= 0) continue;

        // Match as much as we can with this order
        const matchQuantity = Math.min(remainingQuantity, availableToBuy);
        const executedPrice = buyOrder.price;

        // Create and record the trade
        const newTrade: Trade = {
          buyId: buyOrder.id,
          sellId: marketSellOrder.id,
          quantity: matchQuantity,
          executedPrice
        };
        trades.push(newTrade);

        // Mark both orders as matched
        matchedOrders.add(marketSellOrder.id);
        matchedOrders.add(buyOrder.id);

        // Update both orders
        ordersToMatch = ordersToMatch.map(o => {
          if (o.id === buyOrder.id) {
            return {
              ...o,
              filledQuantity: o.filledQuantity + matchQuantity,
              executedPrice: executedPrice
            };
          }
          if (o.id === marketSellOrder.id) {
            return {
              ...o,
              filledQuantity: o.filledQuantity + matchQuantity,
              executedPrice: executedPrice
            };
          }
          return o;
        });

        // Update running totals
        weightedPrice += executedPrice * matchQuantity;
        totalMatchedQuantity += matchQuantity;
        remainingQuantity -= matchQuantity;
      }

      // If we matched anything, record the result
      if (totalMatchedQuantity > 0) {
        const avgExecutedPrice = weightedPrice / totalMatchedQuantity;
        result = {
          matched: true,
          order: {
            ...marketSellOrder,
            quantity: marketSellOrder.quantity,
            filledQuantity: totalMatchedQuantity,
            executedPrice: totalMatchedQuantity === marketSellOrder.quantity ? avgExecutedPrice : undefined
          }
        };
        hasMatches = true;
      }
    }

    // Then handle limit orders
    for (const buyOrder of buyOrders) {
      if (matchedOrders.has(buyOrder.id)) continue;
      
      const remainingToBuy = buyOrder.quantity - buyOrder.filledQuantity;
      if (remainingToBuy <= 0) continue;

      // Find matching sell orders with favorable prices
      const matchingSellOrders = sellOrders.filter(sellOrder => 
        sellOrder.price <= buyOrder.price && 
        (sellOrder.quantity - sellOrder.filledQuantity) > 0 &&
        !matchedOrders.has(sellOrder.id)
      );

      if (matchingSellOrders.length === 0) continue;

      let totalMatchedQuantity = 0;
      let weightedPrice = 0;
      let remainingQuantity = remainingToBuy;

      // Match against sell orders until fully filled or no more matches
      for (const sellOrder of matchingSellOrders) {
        if (remainingQuantity <= 0) break;
        
        const availableToSell = sellOrder.quantity - sellOrder.filledQuantity;
        if (availableToSell <= 0) continue;

        // Match as much as we can with this order
        const matchQuantity = Math.min(remainingQuantity, availableToSell);
        const executedPrice = sellOrder.price;

        // Create and record the trade
        const newTrade: Trade = {
          buyId: buyOrder.id,
          sellId: sellOrder.id,
          quantity: matchQuantity,
          executedPrice
        };
        trades.push(newTrade);

        // Mark both orders as matched
        matchedOrders.add(buyOrder.id);
        matchedOrders.add(sellOrder.id);

        // Update both orders
        ordersToMatch = ordersToMatch.map(o => {
          if (o.id === sellOrder.id) {
            return {
              ...o,
              filledQuantity: o.filledQuantity + matchQuantity,
              executedPrice: executedPrice
            };
          }
          if (o.id === buyOrder.id) {
            return {
              ...o,
              filledQuantity: o.filledQuantity + matchQuantity,
              executedPrice: executedPrice
            };
          }
          return o;
        });

        // Update running totals
        weightedPrice += executedPrice * matchQuantity;
        totalMatchedQuantity += matchQuantity;
        remainingQuantity -= matchQuantity;
      }

      // If we matched anything, record the result
      if (totalMatchedQuantity > 0) {
        const avgExecutedPrice = weightedPrice / totalMatchedQuantity;
        result = {
          matched: true,
          order: {
            ...buyOrder,
            quantity: buyOrder.quantity,
            filledQuantity: totalMatchedQuantity,
            executedPrice: avgExecutedPrice
          }
        };
        hasMatches = true;
      }
    }

    orders = ordersToMatch;
  }

  return result;
}

// Update createOrder to handle continuous matching
export const mockApi = {
  getOrders: async () => {
    await delay(300);
    const visibleOrders = orders.map(order => {
      const remainingQuantity = order.quantity - (order.filledQuantity || 0);
      return {
        ...order,
        quantity: remainingQuantity > 0 ? remainingQuantity : order.quantity,
        executedPrice: order.filledQuantity === order.quantity ? order.executedPrice : undefined
      };
    });
    console.log('mockApi.getOrders called, returning orders:', visibleOrders);
    return visibleOrders;
  },
  
  getMarketPageOrders: async () => {
    await delay(300);
    const marketPageOrders = orders.filter(o => o.filledQuantity < o.quantity && !o.isUserInput);
    console.log('mockApi.getMarketPageOrders called, returning market page orders:', marketPageOrders);
    return marketPageOrders;
  },
  
  createOrder: async (order: Omit<Order, 'id' | 'createdAt' | 'filledQuantity'>) => {
    await delay(300);
    console.log('Starting createOrder with input:', order);

    const newOrder: Order = {
      ...order,
      id: nextId++,
      filledQuantity: 0,
      price: order.price,
      createdAt: new Date().toISOString(),
      isUserInput: order.isUserInput ?? true,
      executedPrice: undefined
    };

    console.log('Creating new order:', newOrder);
    orders = [...orders, newOrder];
    
    const result = matchOrders(orders);
    console.log('Matching result:', result);
    
    return {
      order: newOrder,
      matched: result.matched
    };
  },
  
  updateOrder: async (id: number, orderUpdate: Partial<Order>) => {
    await delay(300);
    const existingOrder = orders.find(o => o.id === id);
    if (!existingOrder) {
      throw new Error('Order not found');
    }

    let orderPrice = orderUpdate.price ?? existingOrder.price;
    const orderType = orderUpdate.type ?? existingOrder.type;
    const orderSide = orderUpdate.side ?? existingOrder.side;
    const originalType = orderUpdate.originalType ?? existingOrder.originalType;

    if (orderType === 'MARKET' || originalType === 'PEGGED') {
      const oppositeOrders = orders.filter(o => 
        o.type === 'LIMIT' && 
        o.side !== orderSide && 
        o.executedPrice === undefined &&
        o.id !== id
      );

      console.log('Finding matching price for updated', orderType, 'order. Available opposite orders:', oppositeOrders);

      if (orderSide === 'BUY') {
        const sortedSellOrders = [...oppositeOrders].sort((a, b) => a.price - b.price);
        let remainingQuantity = orderUpdate.quantity ?? existingOrder.quantity;
        let weightedPrice = 0;
        let totalMatchedQuantity = 0;

        for (const sellOrder of sortedSellOrders) {
          const availableToSell = sellOrder.quantity - sellOrder.filledQuantity;
          if (availableToSell <= 0) continue;
          
          const matchQuantity = Math.min(remainingQuantity, availableToSell);
          weightedPrice += sellOrder.price * matchQuantity;
          totalMatchedQuantity += matchQuantity;
          remainingQuantity -= matchQuantity;
          if (remainingQuantity <= 0) break;
        }

        if (totalMatchedQuantity === 0) {
          throw new Error('No sell orders available to match with');
        }
        orderPrice = weightedPrice / totalMatchedQuantity;
        console.log('Updated buy order - using weighted average price:', orderPrice);

      } else {
        const sortedBuyOrders = [...oppositeOrders].sort((a, b) => b.price - a.price);
        let remainingQuantity = orderUpdate.quantity ?? existingOrder.quantity;
        let weightedPrice = 0;
        let totalMatchedQuantity = 0;

        for (const buyOrder of sortedBuyOrders) {
          const availableToBuy = buyOrder.quantity - buyOrder.filledQuantity;
          if (availableToBuy <= 0) continue;
          
          const matchQuantity = Math.min(remainingQuantity, availableToBuy);
          weightedPrice += buyOrder.price * matchQuantity;
          totalMatchedQuantity += matchQuantity;
          remainingQuantity -= matchQuantity;
          if (remainingQuantity <= 0) break;
        }

        if (totalMatchedQuantity === 0) {
          throw new Error('No buy orders available to match with');
        }
        orderPrice = weightedPrice / totalMatchedQuantity;
        console.log('Updated sell order - using weighted average price:', orderPrice);
      }
    }
    
    const updatedOrder: Order = {
      ...existingOrder,
      ...orderUpdate,
      id,
      price: orderPrice,
      isUserInput: existingOrder.isUserInput,
      type: orderType,
      originalType: originalType,
      side: orderSide,
      quantity: orderUpdate.quantity ?? existingOrder.quantity,
      createdAt: existingOrder.createdAt,
      executedPrice: undefined
    };
    
    console.log('Updating order:', updatedOrder);
    orders = orders.map(o => o.id === id ? updatedOrder : o);

    // Only match orders once
    const result = matchOrders(orders);
    console.log('Matching result:', result);

    return {
      order: updatedOrder,
      matched: result.matched
    };
  },
  
  deleteOrder: async (id: number) => {
    await delay(300);
    const orderExists = orders.some(o => o.id === id);
    if (!orderExists) {
      throw new Error('Order not found');
    }
    orders = orders.filter(o => o.id !== id);
  },
  
  getTrades: async () => {
    await delay(300);
    return [...trades];
  }
}; 