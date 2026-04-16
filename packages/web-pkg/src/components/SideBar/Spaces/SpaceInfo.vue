<template>
  <div class="grid items-center min-w-0 p-0">
    <div class="flex items-center text-sm min-w-0">
      <oc-icon
        name="layout-grid"
        :size="resource.description ? 'large' : 'medium'"
        class="block mr-2 shrink-0"
      />
      <div class="min-w-0">
        <h2
          data-testid="space-info-name"
          class="font-semibold m-0 text-base min-w-0 truncate"
          v-text="resource.name"
        />
        <span
          v-if="resource.description"
          data-testid="space-info-subtitle"
          class="block min-w-0 truncate"
          v-text="resource.description"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'

const resource = inject<SpaceResource>('resource')
</script>
