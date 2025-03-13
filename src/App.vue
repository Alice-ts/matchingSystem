<template>
  <router-view />
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { onMounted } from 'vue';

const $q = useQuasar();

onMounted(() => {
  $q.dark.set(true);
});
</script>

<style>
:root {
  --primary-dark: #1a365d;
  --secondary-dark: #2c5282;
  --accent-dark: #4299e1;
  --background-dark: #1a202c;
  --surface-dark: #2d3748;
  --text-primary: #e2e8f0;
  --text-secondary: #a0aec0;
}

body {
  background-color: var(--background-dark);
  color: var(--text-primary);
}

.q-table__container,
.q-table__card {
  background-color: var(--surface-dark) !important;
}

.q-table th {
  background-color: var(--primary-dark) !important;
  color: var(--text-primary) !important;
}

.q-table tbody tr:hover {
  background-color: var(--secondary-dark) !important;
}

.q-field--outlined .q-field__control {
  background: var(--surface-dark) !important;
}

.q-card {
  background-color: var(--surface-dark) !important;
}

.q-btn {
  background-color: var(--secondary-dark) !important;
}

.q-btn--flat {
  background-color: transparent !important;
}
</style>
