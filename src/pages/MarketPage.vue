<template>
  <q-page padding class="market-page">
    <div class="row q-col-gutter-md">
      <!-- Input Form -->
      <div class="col-12 col-md-4">
        <q-card class="order-form">
          <q-card-section>
            <div class="text-h6 text-primary">New Order</div>
          </q-card-section>

          <q-card-section>
            <q-form @submit.prevent="onSubmit" class="q-gutter-md">
              <q-select
                v-model="newOrder.type"
                :options="['LIMIT', 'MARKET', 'PEGGED']"
                label="Order Type *"
                outlined
                dense
                dark
                color="accent"
              />

              <q-select
                v-model="newOrder.side"
                :options="['BUY', 'SELL']"
                label="Side *"
                outlined
                dense
                dark
                color="accent"
              />

              <q-input
                v-model.number="newOrder.quantity"
                type="number"
                label="Quantity *"
                outlined
                dense
                dark
                color="accent"
              />

              <q-input
                v-if="newOrder.type === 'LIMIT'"
                v-model.number="newOrder.price"
                type="number"
                label="Price *"
                outlined
                dense
                dark
                color="accent"
              />

              <q-btn
                label="Submit"
                type="submit"
                color="accent"
                class="full-width"
                :loading="submitting"
              />
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <!-- Order Book Tables -->
      <div class="col-12 col-md-8">
        <!-- Best Prices Frame -->
        <q-card class="q-mb-md best-prices-card">
          <q-card-section>
            <div class="row justify-between items-center">
              <div class="col-6 text-center">
                <div class="text-subtitle2">Best Buy Price</div>
                <div class="text-h6 text-positive">
                  {{ bestBuyPrice ? `$${bestBuyPrice.toFixed(2)}` : '-' }}
                </div>
              </div>
              <div class="col-6 text-center">
                <div class="text-subtitle2">Best Sell Price</div>
                <div class="text-h6 text-negative">
                  {{ bestSellPrice ? `$${bestSellPrice.toFixed(2)}` : '-' }}
                </div>
              </div>
            </div>
            <div class="row justify-center q-mt-md">
              <q-btn
                color="accent"
                label="Generate Liquidity"
                :loading="generatingLiquidity"
                @click="generateLiquidity"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- Market Orders Table -->
        <q-table
          title="Market Orders"
          :rows="marketOrders"
          :columns="columns"
          row-key="id"
          :pagination="{ rowsPerPage: 10 }"
          flat
          bordered
          class="q-mb-md"
        >
          <template v-slot:body="props">
            <q-tr :props="props" :class="[
              props.row.isUserInput ? 'user-input-row' : '',
              props.row.id === selectedRowId ? 'selected-row' : ''
            ]">
              <q-td v-for="col in props.cols" :key="col.name" :props="props">
                <template v-if="col.name === 'actions'">
                  <div class="row q-gutter-sm justify-center">
                    <q-btn
                      flat
                      round
                      color="primary"
                      icon="edit"
                      size="sm"
                      @click.stop="startEdit(props.row)"
                      :disable="!props.row.isUserInput"
                    >
                      <q-tooltip>{{ props.row.isUserInput ? 'Edit Order' : 'Cannot edit non-user orders' }}</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      color="negative"
                      icon="cancel"
                      size="sm"
                      @click.stop="cancelOrder(props.row)"
                    >
                      <q-tooltip>Cancel Order</q-tooltip>
                    </q-btn>
                  </div>
                </template>
                <template v-else>
                  {{ col.value }}
                </template>
              </q-td>
            </q-tr>
          </template>
        </q-table>

        <!-- Trade Messages Area -->
        <div class="trade-messages-container">
          <transition-group name="fade">
            <div v-for="message in tradeMessages" 
                 :key="message.id" 
                 :class="['trade-message', message.type === 'match' ? 'match-message' : 'text-positive']">
              <q-icon 
                v-if="message.type === 'match'" 
                name="swap_horiz" 
                size="sm" 
                class="q-mr-sm"
              />
              {{ message.text }}
            </div>
          </transition-group>
        </div>

        <!-- Order Form -->
        <q-card class="order-form-card">
          <!-- Edit Dialog -->
          <q-dialog v-model="editDialog">
            <q-card style="min-width: 350px">
              <q-card-section>
                <div class="text-h6 text-primary">Edit Order</div>
              </q-card-section>

              <q-card-section>
                <q-form @submit="saveEdit" class="q-gutter-md">
                  <q-select
                    v-model="editingOrder.type"
                    :options="['LIMIT', 'MARKET']"
                    label="Order Type"
                    outlined
                    dense
                    dark
                    color="accent"
                  />

                  <q-select
                    v-model="editingOrder.side"
                    :options="['BUY', 'SELL']"
                    label="Side"
                    outlined
                    dense
                    dark
                    color="accent"
                  />

                  <q-input
                    v-model.number="editingOrder.quantity"
                    type="number"
                    label="Quantity"
                    outlined
                    dense
                    dark
                    color="accent"
                  />

                  <q-input
                    v-if="editingOrder.type === 'LIMIT'"
                    v-model.number="editingOrder.price"
                    type="number"
                    label="Price"
                    outlined
                    dense
                    dark
                    color="accent"
                  />
                </q-form>
              </q-card-section>

              <q-card-actions align="right" class="bg-dark q-pa-md">
                <q-btn flat label="Cancel" color="accent" v-close-popup />
                <q-btn flat label="Save" color="accent" @click="saveEdit" />
              </q-card-actions>
            </q-card>
          </q-dialog>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { mockApi } from 'src/services/mockData';
import type { Order, OrderType, OrderSide, Trade } from 'src/services/mockData';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const orders = ref<Order[]>([]);
const loading = ref(false);
const submitting = ref(false);
const editDialog = ref(false);
const editingOrder = ref<Partial<Order>>({});
const selectedRowId = ref<number | null>(null);
const tradeMessages = ref<Array<{id: number, text: string, type: 'trade' | 'match' | 'info'}>>([]);
let messageId = 0;
const generatingLiquidity = ref(false);

const columns = [
  { 
    name: 'id', 
    label: 'ID', 
    field: 'id', 
    sortable: true,
    align: 'right' as const,
    format: (val: number) => val.toString().padStart(6, '0')
  },
  { 
    name: 'type', 
    label: 'Type', 
    field: 'type', 
    sortable: true 
  },
  { 
    name: 'side', 
    label: 'Side', 
    field: 'side', 
    sortable: true 
  },
  { 
    name: 'quantity', 
    label: 'Quantity', 
    field: 'quantity', 
    sortable: true,
    align: 'right' as const,
    format: (val: number) => val.toLocaleString()
  },
  { 
    name: 'price', 
    label: 'Price', 
    field: (row: Order) => row.type === 'MARKET' ? row.executedPrice : row.price,
    sortable: true,
    align: 'right' as const,
    format: (val: number) => val ? `$${val.toFixed(2)}` : '-'
  },
  { 
    name: 'isUserInput', 
    label: 'Mine?', 
    field: 'isUserInput', 
    sortable: true,
    format: (val: boolean) => val ? 'Yes' : 'No'
  },
  { 
    name: 'createdAt', 
    label: 'Created At', 
    field: 'createdAt', 
    sortable: true,
    format: (val: string) => new Date(val).toLocaleString()
  },
  { 
    name: 'actions',
    label: 'Actions',
    field: 'actions',
    align: 'center' as const,
  }
];

const newOrder = ref<{
  type: OrderType;
  side: OrderSide;
  quantity: number;
  price: number;
}>({
  type: 'LIMIT',
  side: 'BUY',
  quantity: 0,
  price: 0
});

const marketOrders = computed(() => {
  return orders.value.filter(order => order.executedPrice === undefined);
});

const bestBuyPrice = computed(() => {
  const buyOrders = orders.value.filter(order => 
    order.executedPrice === undefined && 
    order.side === 'BUY' &&
    (order.type === 'LIMIT' || order.originalType === 'PEGGED')
  );
  if (buyOrders.length === 0) return 0;
  return Math.max(...buyOrders.map(order => order.price));
});

const bestSellPrice = computed(() => {
  const sellOrders = orders.value.filter(order => 
    order.executedPrice === undefined && 
    order.side === 'SELL' &&
    (order.type === 'LIMIT' || order.originalType === 'PEGGED')
  );
  if (sellOrders.length === 0) return 0;
  return Math.min(...sellOrders.map(order => order.price));
});

const trades = ref<Trade[]>([]);


async function fetchOrders() {
  loading.value = true;
  try {
    console.log('Fetching orders and trades from mockApi...');
    const [apiOrders, apiTrades] = await Promise.all([
      mockApi.getOrders(),
      mockApi.getTrades()
    ]);
    console.log('Received orders from API:', apiOrders);
    console.log('Received trades from API:', apiTrades);
    
    orders.value = apiOrders.map(apiOrder => ({
      ...apiOrder,
      price: apiOrder.price ?? 0,
      executedPrice: apiOrder.executedPrice
    }));
    
    trades.value = apiTrades;
    console.log('Processed orders:', orders.value);
    console.log('Processed trades:', trades.value);
  } catch (error) {
    console.error('Error fetching orders and trades:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to fetch orders and trades'
    });
  } finally {
    loading.value = false;
  }
}

async function onSubmit() {
  if (newOrder.value.quantity <= 0) {
    $q.notify({
      type: 'warning',
      message: 'Quantity must be greater than 0'
    });
    return;
  }

  if (newOrder.value.type === 'LIMIT' && (!newOrder.value.price || newOrder.value.price <= 0)) {
    $q.notify({
      type: 'warning',
      message: 'Price must be greater than 0 for limit orders'
    });
    return;
  }

  submitting.value = true;
  try {
    // Get current trades count before submitting
    const currentTrades = await mockApi.getTrades();
    const tradesCountBefore = currentTrades.length;

    let orderPrice = 0;
    
    if (newOrder.value.type === 'LIMIT') {
      orderPrice = newOrder.value.price;
    } else if (newOrder.value.type === 'MARKET' || newOrder.value.type === 'PEGGED') {
      if (newOrder.value.side === 'BUY') {
        if (newOrder.value.type === 'MARKET') {
          orderPrice = bestSellPrice.value || 0;
          if (orderPrice === 0) {
            throw new Error('No sell orders available to match with');
          }
        } else { // PEGGED
          orderPrice = bestBuyPrice.value || 0;
          if (orderPrice === 0) {
            throw new Error('No buy orders available to peg to');
          }
        }
      } else { // SELL
        if (newOrder.value.type === 'MARKET') {
          orderPrice = bestBuyPrice.value || 0;
          if (orderPrice === 0) {
            throw new Error('No buy orders available to match with');
          }
        } else { // PEGGED
          orderPrice = bestSellPrice.value || 0;
          if (orderPrice === 0) {
            throw new Error('No sell orders available to peg to');
          }
        }
      }
    }

    const orderToSubmit = {
      type: newOrder.value.type,
      originalType: newOrder.value.type,
      side: newOrder.value.side,
      quantity: newOrder.value.quantity,
      price: orderPrice,
      executedPrice: undefined,
      isUserInput: true
    };

    const result = await mockApi.createOrder(orderToSubmit);
    
    // Get new trades after submission
    const latestTrades = await mockApi.getTrades();
    // Only look at newly created trades
    const newTrades = latestTrades.slice(tradesCountBefore);
    
    // Get all orders to check for user input
    const allOrders = await mockApi.getOrders();
    const userOrders = new Set(allOrders.filter(o => o.isUserInput).map(o => o.id));
    
    // Filter trades involving our order and calculate quantities
    const orderTrades = newTrades.filter(trade => 
      trade.buyId === result.order.id || trade.sellId === result.order.id
    );

    if (orderTrades.length > 0) {
      // Calculate total quantity based on our side of the trades
      const totalQuantity = orderTrades.reduce((sum, trade) => {
        // If we're on both sides, count quantity once
        if (userOrders.has(trade.buyId) && userOrders.has(trade.sellId)) {
          return sum + trade.quantity;
        }
        // If we're only on one side, count that trade
        if ((trade.buyId === result.order.id) || (trade.sellId === result.order.id)) {
          return sum + trade.quantity;
        }
        return sum;
      }, 0);
      
      // Calculate weighted average price
      const weightedTotal = orderTrades.reduce((sum, trade) => sum + trade.quantity * trade.executedPrice, 0);
      const avgExecutedPrice = weightedTotal / totalQuantity;

      addTradeMessage(
        `Trade, price: $${avgExecutedPrice.toFixed(2)}, qty: ${totalQuantity}`,
        'match'
      );
    }

    await fetchOrders();

    newOrder.value = {
      type: 'LIMIT',
      side: 'BUY',
      quantity: 0,
      price: 0
    };
  } catch (error) {
    console.error('Error submitting order:', error);
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Failed to create order'
    });
  } finally {
    submitting.value = false;
  }
}

function startEdit(order: Order) {
  editingOrder.value = { ...order };
  editDialog.value = true;
  addTradeMessage(`Editing Order #${order.id.toString().padStart(6, '0')}`);
}

async function saveEdit() {
  try {
    if (editingOrder.value.id && editingOrder.value.type && editingOrder.value.side && editingOrder.value.quantity !== undefined) {
      // Get current trades count before updating
      const currentTrades = await mockApi.getTrades();
      const tradesCountBefore = currentTrades.length;

      let orderPrice = 0;
      
      if (editingOrder.value.type === 'LIMIT') {
        orderPrice = editingOrder.value.price || 0;
      } else if (editingOrder.value.type === 'MARKET' || editingOrder.value.type === 'PEGGED') {
        if (editingOrder.value.side === 'BUY') {
          orderPrice = bestSellPrice.value || 0;
          if (orderPrice === 0) {
            throw new Error('No sell orders available to match with');
          }
        } else {
          orderPrice = bestBuyPrice.value || 0;
          if (orderPrice === 0) {
            throw new Error('No buy orders available to match with');
          }
        }
      }

      const orderToUpdate = {
        ...editingOrder.value,
        price: orderPrice
      };

      await mockApi.updateOrder(editingOrder.value.id, orderToUpdate);
      
      // Get new trades after update
      const latestTrades = await mockApi.getTrades();
      // Only look at newly created trades
      const newTrades = latestTrades.slice(tradesCountBefore);
      
      // Get all orders to check for user input
      const allOrders = await mockApi.getOrders();
      const userOrders = new Set(allOrders.filter(o => o.isUserInput).map(o => o.id));
      
      // Filter trades involving our order
      const orderTrades = newTrades.filter(trade => 
        trade.buyId === editingOrder.value.id || trade.sellId === editingOrder.value.id
      );

      await fetchOrders();
      editDialog.value = false;

      if (orderTrades.length > 0) {
        // Calculate total quantity based on our side of the trades
        const totalQuantity = orderTrades.reduce((sum, trade) => {
          // If we're on both sides, count quantity once
          if (userOrders.has(trade.buyId) && userOrders.has(trade.sellId)) {
            return sum + trade.quantity;
          }
          // If we're only on one side, count that trade
          if ((trade.buyId === editingOrder.value.id) || (trade.sellId === editingOrder.value.id)) {
            return sum + trade.quantity;
          }
          return sum;
        }, 0);
        
        // Calculate weighted average price
        const weightedTotal = orderTrades.reduce((sum, trade) => sum + trade.quantity * trade.executedPrice, 0);
        const avgExecutedPrice = weightedTotal / totalQuantity;

        addTradeMessage(
          `Trade, price: ${avgExecutedPrice.toFixed(2)}, qty: ${totalQuantity}`,
          'match'
        );
      } else {
        addTradeMessage(
          `Order #${editingOrder.value.id.toString().padStart(6, '0')} updated successfully`,
          'info'
        );
      }
    }
  } catch (error) {
    console.error('Error updating order:', error);
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Failed to update order'
    });
  }
}

async function cancelOrder(order: Order) {
  try {
    await mockApi.deleteOrder(order.id);
    await fetchOrders();
    addTradeMessage(`Order #${order.id.toString().padStart(6, '0')} cancelled`);
  } catch (error) {
    console.error('Error cancelling order:', error);
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Failed to cancel order'
    });
  }
}

function addTradeMessage(message: string, type: 'trade' | 'match' | 'info' = 'info') {
  const id = messageId++;
  tradeMessages.value.push({ id, text: message, type });
  
  // Play a sound for match notifications
  if (type === 'match') {
    const audio = new Audio('/notification.mp3');
    void audio.play().catch(console.error);
  }
  
  setTimeout(() => {
    tradeMessages.value = tradeMessages.value.filter(m => m.id !== id);
  }, type === 'match' ? 8000 : 3000); // Show match messages longer
}

async function generateLiquidity() {
  generatingLiquidity.value = true;
  try {
    // Calculate market price (average of best buy and sell)
    const marketPrice = (bestBuyPrice.value + bestSellPrice.value) / 2 || 150; // Default to 150 if no prices
    
    // Generate 5-10 random orders
    const numOrders = Math.floor(Math.random() * 6) + 5;
    
    // Create orders sequentially to maintain price accuracy
    for (let i = 0; i < numOrders; i++) {
      // Fetch latest prices before creating each order
      await fetchOrders();
      const currentMarketPrice = (bestBuyPrice.value + bestSellPrice.value) / 2 || marketPrice;
      
      // Random side
      const side: OrderSide = Math.random() < 0.5 ? 'BUY' : 'SELL';
      
      // Random quantity between 10 and 100
      const quantity = Math.floor(Math.random() * 91) + 10;
      
      // Price with normal distribution around current market price
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const spread = currentMarketPrice * 0.02; // 2% standard deviation
      let price = currentMarketPrice + z * spread;
      
      // Ensure price is positive and adjust based on side
      price = Math.max(price, currentMarketPrice * 0.9);
      if (side === 'BUY') {
        price = Math.min(price, currentMarketPrice); // Buy orders below market
      } else {
        price = Math.max(price, currentMarketPrice); // Sell orders above market
      }
      
      const orderToSubmit = {
        type: 'LIMIT' as const,
        originalType: 'LIMIT' as const,
        side,
        quantity,
        price: Number(price.toFixed(2)),
        executedPrice: undefined,
        isUserInput: false
      };

      await mockApi.createOrder(orderToSubmit);
    }
    
    // Final fetch to update display
    await fetchOrders();
    
    $q.notify({
      type: 'positive',
      message: `Generated ${numOrders} liquidity orders`
    });
  } catch (error) {
    console.error('Error generating liquidity:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to generate liquidity'
    });
  } finally {
    generatingLiquidity.value = false;
  }
}

onMounted(() => {
  console.log('MarketPage mounted - fetching orders...');
  fetchOrders().then(() => {
    console.log('Orders fetched:', orders.value);
  }).catch(error => {
    console.error('Error fetching orders:', error);
  });
});
</script>

<style scoped>
.market-page {
  background-color: var(--background-dark);
}

.order-form {
  position: sticky;
  top: 20px;
  border: 1px solid var(--secondary-dark);
}

.order-table {
  border: 1px solid var(--secondary-dark);
}

:deep(.q-field__native),
:deep(.q-field__prefix),
:deep(.q-field__suffix),
:deep(.q-field__input) {
  color: var(--text-primary) !important;
}

:deep(.q-field__label) {
  color: var(--text-secondary) !important;
}

:deep(.q-field--focused .q-field__label) {
  color: var(--accent-dark) !important;
}

:deep(.q-table__grid-content) {
  background-color: var(--surface-dark) !important;
}

:deep(.q-table thead) {
  background-color: var(--primary-dark) !important;
}

:deep(.q-table tbody td) {
  color: var(--text-primary) !important;
}

:deep(.q-table tbody tr) {
  background: transparent !important;
  margin: 4px 0;
  transition: all 0.3s ease;
  cursor: pointer;
}

:deep(.q-table tbody tr.user-input-row td) {
  color: #4CAF50 !important;
  font-weight: 500;
}

:deep(.q-table tbody tr.modified-row) {
  border: 1px solid #FFD700 !important;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.3) !important;
}

:deep(.q-table tbody tr.selected-row) {
  background: #2c5282 !important;
}

:deep(.q-table tbody tr:hover) {
  background: rgba(255, 255, 255, 0.05) !important;
}

.order-table :deep(thead) {
  background-color: var(--primary-dark) !important;
}

.order-table :deep(.q-table__container) {
  background: transparent !important;
}

:deep(.text-green) {
  color: #4CAF50 !important;
  font-weight: 500;
}

:deep(.selected-row) {
  background: #2c5282 !important;
}

:deep(.q-tr) {
  cursor: pointer;
}

:deep(.q-tr:hover) {
  background: rgba(255, 255, 255, 0.05) !important;
}

:deep(.q-toggle__label) {
  color: var(--text-primary) !important;
}

.status-card {
  text-align: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

:deep(.q-td.text-center .q-btn-group) {
  justify-content: center;
  display: flex;
  align-items: center;
  height: 100%;
}

:deep(.q-td.text-center) {
  padding: 4px !important;
}

:deep(.q-btn-group) {
  display: inline-flex;
  align-items: center;
}

:deep(.q-btn-group .q-btn) {
  margin: 0 2px;
}

:deep(.action-cell),
:deep(.action-cell .q-btn-group),
:deep(.action-cell .q-btn) {
  display: none;
}

.best-prices-card {
  background-color: var(--surface-dark);
  border: 1px solid var(--secondary-dark);
}

.text-positive {
  color: #4CAF50 !important;
}

.text-negative {
  color: #f44336 !important;
}

.trade-messages-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2000;
}

.trade-message {
  background: rgba(0, 0, 0, 0.85);
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 12px;
  font-size: 1.2rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  min-width: 300px;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.match-message {
  background: rgba(25, 118, 210, 0.9);
  color: white !important;
  border-left: 4px solid #64b5f6;
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  
  .q-icon {
    color: #64b5f6;
    font-size: 1.5em;
    margin-right: 12px;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(20px) scale(0.8);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px) scale(0.8);
}

.order-form-card {
  background: var(--surface-dark) !important;
  border: 1px solid var(--secondary-dark);
}

.q-btn.q-btn--flat.q-btn--round {
  opacity: 0.8;
  transition: opacity 0.3s ease;
  
  &:hover {
    opacity: 1;
  }
}

.my-trade-row {
  background: rgba(76, 175, 80, 0.15) !important;
  
  td {
    color: #4CAF50 !important;
    font-weight: 500;
  }
}

:deep(.q-table tbody tr.my-trade-row:hover) {
  background: rgba(76, 175, 80, 0.25) !important;
}
</style> 
