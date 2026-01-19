<template>
  <div class="grid items-center p-2">
    <div class="flex items-center text-sm">
      <oc-icon
        name="layout-grid"
        :size="resource.description ? 'large' : 'medium'"
        class="block mr-2"
      />
      <div>
        <h3
          data-testid="space-info-name"
          class="font-semibold m-0 text-base break-all"
          v-text="resource.name"
        />
        <span data-testid="space-info-subtitle" v-text="resource.description" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'

const resource = inject<SpaceResource>('resource')
</script>
