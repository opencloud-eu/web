<template>
  <div class="grid items-center p-2">
    <div class="flex items-center text-sm">
      <div class="mr-2">
        <oc-icon
          name="layout-grid"
          :size="resource.description ? 'large' : 'medium'"
          class="block"
        />
      </div>
      <div>
        <h3
          data-testid="space-info-name"
          class="font-semibold m-0 text-base"
          v-text="resource.name"
        />
        <span data-testid="space-info-subtitle" v-text="resource.description" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, inject } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'

export default defineComponent({
  name: 'SpaceInfo',
  setup() {
    return {
      resource: inject<SpaceResource>('resource')
    }
  }
})
</script>
