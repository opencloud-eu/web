<template>
  <main id="app-store" class="p-4 overflow-auto">
    <app-loading-spinner v-if="areAppsLoading" />
    <router-view v-else data-testid="app-store-router-view" />
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { useAppsStore } from './piniaStores'

const appsStore = useAppsStore()

const areAppsLoading = ref(true)

onMounted(async () => {
  try {
    await appsStore.loadApps()
  } catch (e) {
    console.error(e)
  } finally {
    areAppsLoading.value = false
  }
})
</script>
