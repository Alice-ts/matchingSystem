<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-transparent">
      <q-toolbar class="header-toolbar">
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />
        <q-toolbar-title>MSMS</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      bordered
      class="sidebar"
      :width="250"
      :breakpoint="500"
      persistent
    >
      <q-list>
        <q-item-label header class="text-h6">
          MSMS
        </q-item-label>

        <q-item to="/" exact clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>Home</q-item-section>
        </q-item>

        <q-item to="/market" exact clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="show_chart" />
          </q-item-section>
          <q-item-section>Market</q-item-section>
        </q-item>

        <q-item to="/my-book" exact clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="book" />
          </q-item-section>
          <q-item-section>My Book</q-item-section>
        </q-item>

        <q-item to="/trades" exact clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="swap_horiz" />
          </q-item-section>
          <q-item-section>Trades</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const leftDrawerOpen = ref(true);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>

<style scoped>
.sidebar {
  background: linear-gradient(145deg, rgba(42, 42, 56, 0.95) 0%, rgba(28, 28, 38, 0.95) 100%) !important;
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.header-toolbar {
  background: rgba(28, 28, 38, 0.95) !important;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.q-item.q-router-link--active) {
  background: rgba(255, 255, 255, 0.1) !important;
}

:deep(.q-item) {
  color: #e2e8f0 !important;
  transition: all 0.3s ease;
}

:deep(.q-item:hover) {
  background: rgba(255, 255, 255, 0.05) !important;
}

:deep(.q-item__section--avatar) {
  color: #a0aec0;
}

:deep(.q-toolbar__title),
:deep(.q-item-label) {
  color: #e2e8f0;
  font-weight: 300;
  letter-spacing: 0.05em;
}
</style>
