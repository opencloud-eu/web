<template>
  <main id="app-store" class="p-4 overflow-auto">
    <app-loading-spinner v-if="areAppsLoading" />
    <template v-else>
      <router-view data-testid="app-store-router-view" />
    </template>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAppsStore } from './piniaStores'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'

const appsStore = useAppsStore()

const areAppsLoading = ref(true)
const appsLoadingPromise = appsStore.loadApps()
onMounted(async () => {
  try {
    await appsLoadingPromise
  } catch (e) {
    console.error(e)
  } finally {
    areAppsLoading.value = false
  }
})
</script>
