<template>
  <q-page padding class="trades-page">
    <q-table
      title="Executed Trades"
      :rows="trades"
      :columns="columns"
      row-key="buyId"
      :loading="loading"
      :pagination="{ rowsPerPage: 10 }"
      dark
      color="primary"
      class="trades-table"
    >
      <template v-slot:body="props">
        <q-tr :props="props" :class="{
          'my-trade-row': orders.some((o: Order) => o.id === props.row.buyId && o.isUserInput) && 
                         orders.some((o: Order) => o.id === props.row.sellId && o.isUserInput)
        }">
          <q-td v-for="col in props.cols" :key="col.name" :props="props">
            <template v-if="col.name === 'buyId'">
              <q-chip
                color="positive"
                text-color="white"
                icon="shopping_cart"
                dark
              >
                {{ col.value }}
              </q-chip>
            </template>
            <template v-else-if="col.name === 'sellId'">
              <q-chip
                color="negative"
                text-color="white"
                icon="sell"
                dark
              >
                {{ col.value }}
              </q-chip>
            </template>
            <template v-else>
              {{ col.value }}
            </template>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { mockApi } from 'src/services/mockData';
import type { Trade, Order } from 'src/services/mockData';

const trades = ref<Trade[]>([]);
const orders = ref<Order[]>([]);
const loading = ref(false);

const columns = [
  {
    name: 'buyId',
    label: 'Buy Order ID',
    field: 'buyId',
    sortable: true,
    align: 'right' as const,
    format: (val: number) => val.toString().padStart(6, '0')
  },
  {
    name: 'sellId',
    label: 'Sell Order ID',
    field: 'sellId',
    sortable: true,
    align: 'right' as const,
    format: (val: number) => val.toString().padStart(6, '0')
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
    name: 'executedPrice',
    label: 'Executed Price',
    field: 'executedPrice',
    sortable: true,
    align: 'right' as const,
    format: (val: number) => `$${val.toFixed(2)}`
  }
];

async function fetchTrades() {
  loading.value = true;
  try {
    const [apiTrades, apiOrders] = await Promise.all([
      mockApi.getTrades(),
      mockApi.getOrders()
    ]);
    trades.value = apiTrades;
    orders.value = apiOrders;
  } catch (error) {
    console.error('Error fetching trades:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void fetchTrades();
});
</script>

<style scoped>
.trades-page {
  background-color: var(--background-dark);
  min-height: 100vh;
}

.trades-table {
  border: 1px solid var(--secondary-dark);
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

:deep(.q-chip) {
  background-color: var(--surface-dark) !important;
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