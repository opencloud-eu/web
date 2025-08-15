<template>
  <oc-status-indicators
    :resource="{ id: '1' }"
    :indicators="[
      {
        id: '1',
        icon: 'cloud',
        label: 'This resource is synced in your cloud.',
        accessibleDescription: 'This resource is synced in your cloud.',
        handler: cloudHandler
      },
      {
        id: '2',
        icon: 'user',
        label: 'This resource has been shared.',
        accessibleDescription: 'This resource has been shared.',
        handler: shareHandler
      }
    ]"
  />
  <div class="mt-4">Cloud indicator clicked: {{ cloudIndicatorClicked }}</div>
  <div>Share indicator clicked: {{ shareIndicatorClicked }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const cloudIndicatorClicked = ref(false)
const shareIndicatorClicked = ref(false)

const cloudHandler = (resource: Record<string, unknown>) => {
  cloudIndicatorClicked.value = true
  // handle indicator click...
}

const shareHandler = (resource: Record<string, unknown>) => {
  shareIndicatorClicked.value = true
  // handle indicator click...
}
</script>
