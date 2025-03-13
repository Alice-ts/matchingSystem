<template>
  <q-page padding class="my-book-page">
    <div class="row q-col-gutter-md">
      <!-- Order Book Table -->
      <div class="col-12">
        <q-table
          title="My Order Book"
          :rows="filteredOrders"
          :columns="columns"
          row-key="id"
          :pagination="pagination"
          :filter="filter"
          flat
          bordered
          :loading="loading"
          @update:pagination="onPaginationUpdate"
        >
          <template v-slot:top-right>
            <q-input
              v-model="filter"
              placeholder="Search orders..."
              dense
              outlined
              dark
              class="q-ml-md"
            >
              <template v-slot:append>
                <q-icon name="search" />
              </template>
            </q-input>
          </template>
          <template v-slot:body="props">
            <q-tr :props="props" :class="[
              props.row.executedPrice ? 'executed-row' : '',
              props.row.id === selectedRowId ? 'selected-row' : '',
              isMyTrade(props.row) ? 'my-trade-row' : ''
            ]">
              <q-td v-for="col in props.cols" :key="col.name" :props="props">
                {{ col.value }}
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { mockApi } from 'src/services/mockData';
import type { Order, Trade } from 'src/services/mockData';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const orders = ref<Order[]>([]);
const trades = ref<Trade[]>([]);
const selectedRowId = ref<number | null>(null);
const filter = ref('');
const loading = ref(false);

type PaginationType = {
  sortBy?: string | null;
  descending?: boolean;
  page?: number;
  rowsPerPage?: number;
  rowsNumber?: number;
};

const pagination = ref<PaginationType>({
  sortBy: 'createdAt',
  descending: true,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
});

const columns = [
  { name: 'id', label: 'ID', field: 'id', sortable: true },
  { name: 'type', label: 'Type', field: 'type', sortable: true },
  { name: 'side', label: 'Side', field: 'side', sortable: true },
  { name: 'quantity', label: 'Quantity', field: 'quantity', sortable: true },
  { 
    name: 'price', 
    label: 'Price', 
    field: (row: Order) => row.executedPrice || row.price,
    sortable: true,
    format: (val: number) => `$${val.toFixed(2)}`
  },
  { 
    name: 'status', 
    label: 'Status', 
    field: (row: Order) => row.executedPrice ? 'Executed' : 'Active',
    sortable: true,
    classes: (row: Order) => row.executedPrice ? 'text-positive' : 'text-warning'
  },
  { 
    name: 'createdAt', 
    label: 'Created At', 
    field: 'createdAt', 
    sortable: true, 
    format: (val: string) => new Date(val).toLocaleString() 
  }
];

const filteredOrders = computed(() => {
  return orders.value
    .filter(order => order.isUserInput)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

// Update pagination rows number
pagination.value.rowsNumber = filteredOrders.value.length;

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
    
    orders.value = apiOrders;
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

function onPaginationUpdate(newPagination: PaginationType) {
  pagination.value = newPagination;
}

// Set up polling for real-time updates
let pollInterval: number;

onMounted(() => {
  console.log('MyBookPage mounted - fetching orders...');
  void fetchOrders();
  // Poll for updates every 5 seconds
  pollInterval = window.setInterval(() => {
    void fetchOrders(); // Call the async function here
  }, 5000);
});

onUnmounted(() => {
  // Clean up polling when component is unmounted
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});

function isMyTrade(order: Order): boolean {
  if (!order.executedPrice) return false;
  
  const trade = trades.value.find((t: Trade) => 
    t.buyId === order.id || t.sellId === order.id
  );
  
  if (!trade) return false;

  const matchedOrder = orders.value.find(o => 
    o.id === (order.id === trade.buyId ? trade.sellId : trade.buyId)
  );

  return matchedOrder?.isUserInput ?? false;
}
</script>

<style scoped>
.my-book-page {
  background-color: var(--background-dark);
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
}

:deep(.q-table tbody tr:hover) {
  background: rgba(255, 255, 255, 0.05) !important;
}

:deep(.executed-row) {
  background: rgba(76, 175, 80, 0.1) !important;
}

:deep(.text-warning) {
  color: #ffa726 !important;
}

:deep(.executed-row:hover) {
  background: rgba(76, 175, 80, 0.2) !important;
}

:deep(.selected-row) {
  background: #2c5282 !important;
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