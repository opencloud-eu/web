<template>
  <main id="app-store" class="p-4 md:px-8 overflow-auto">
    <app-loading-spinner v-if="areAppsLoading" />
    <no-content-message
      v-else-if="loadingFailed"
      id="app-store-loading-failed"
      :icon="{ name: 'error-warning', fillType: 'line' }"
    >
      <template #message>
        <span role="alert" v-text="$gettext('The apps could not be loaded')" />
      </template>
    </no-content-message>
    <router-view v-else data-testid="app-store-router-view" />
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { AppLoadingSpinner, NoContentMessage } from '@opencloud-eu/web-pkg'
import { useAppsStore } from './piniaStores'

const appsStore = useAppsStore()
const { loadingFailed } = storeToRefs(appsStore)

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
