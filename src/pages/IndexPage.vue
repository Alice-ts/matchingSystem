<template>
  <q-page class="home-page q-pa-md">
    <div class="row justify-center items-center">
      <div class="col-12 text-center">
        <q-img
          src="/msms-logo.svg"
          style="width: 800px; max-width: 90vw"
          no-native-menu
          no-spinner
        />
      </div>
    </div>

    <div class="row justify-center q-mt-md">
      <div class="col-12 col-md-6">
        <div class="position-summary">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-4">
              <div class="summary-card">
                <div class="text-subtitle2 text-grey-5">Net Position</div>
                <div class="text-h5 q-mt-sm" :class="positionColor">
                  {{ positionSummary.netPosition > 0 ? 'LONG' : positionSummary.netPosition < 0 ? 'SHORT' : 'FLAT' }}
                  <div class="text-subtitle1">
                    {{ Math.abs(positionSummary.netPosition).toLocaleString() }} shares
                  </div>
                </div>
              </div>
            </div>
            <div class="col-12 col-sm-4">
              <div class="summary-card">
                <div class="text-subtitle2 text-grey-5">Total Volume</div>
                <div class="text-h5 q-mt-sm">
                  {{ positionSummary.totalVolume.toLocaleString() }}
                  <div class="text-subtitle1">shares traded</div>
                </div>
              </div>
            </div>
            <div class="col-12 col-sm-4">
              <div class="summary-card">
                <div class="text-subtitle2 text-grey-5">VWAP</div>
                <div class="text-h5 q-mt-sm">
                  ${{ positionSummary.vwap.toFixed(2) }}
                  <div class="text-subtitle1">per share</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="asset-info q-mt-lg">
          <div class="text-h5 text-weight-light text-grey-4">
            Trading Asset
          </div>
          <div class="text-h3 text-weight-medium q-mt-sm">
            LICE3
          </div>
          <div class="text-subtitle1 text-grey-5 q-mt-sm">
            Alice's Record Label S.A.
          </div>
        </div>
      </div>
    </div>

    <div class="row justify-center q-mt-xl">
      <div class="col-12 text-center">
        <div class="text-subtitle1 text-grey-5">
          Author: Alice Tinoco
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { mockApi } from 'src/services/mockData';
import type { Order } from 'src/services/mockData';

const orders = ref<Order[]>([]);

// Position summary computation
const positionSummary = computed(() => {
  const summary = orders.value
    .filter(order => order.isUserInput) // Only consider user input orders
    .reduce((acc, order) => {
      const quantity = order.quantity;
      const price = order.type === 'MARKET' 
        ? (order.executedPrice ?? 0) 
        : (order.price ?? 0);
      const sign = order.side === 'BUY' ? 1 : -1;
      
      acc.netPosition += quantity * sign;
      acc.totalVolume += quantity;
      acc.totalNotional += quantity * price;
      
      return acc;
    }, {
      netPosition: 0,
      totalVolume: 0,
      totalNotional: 0
    });

  return {
    ...summary,
    vwap: summary.totalVolume > 0 ? summary.totalNotional / summary.totalVolume : 0
  };
});

const positionColor = computed(() => {
  if (positionSummary.value.netPosition > 0) return 'text-positive';
  if (positionSummary.value.netPosition < 0) return 'text-negative';
  return 'text-grey-5';
});

async function fetchOrders() {
  try {
    orders.value = await mockApi.getOrders();
  } catch (error) {
    console.error('Error fetching orders:', error);
  }
}

onMounted(() => {
  void fetchOrders();
});
</script>

<style scoped>
.home-page {
  background-color: var(--background-dark);
  min-height: 100vh;
}

.asset-info, .summary-card {
  text-align: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  animation: fadeIn 0.5s ease-out;
}

.summary-card {
  height: 100%;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.position-summary {
  text-align: center;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
