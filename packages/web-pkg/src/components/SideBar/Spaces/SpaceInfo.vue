<template>
  <div class="space_info p-2">
    <div class="space_info__body oc-text-overflow flex items-center text-sm">
      <div class="mr-2">
        <oc-icon
          name="layout-grid"
          :size="resource.description ? 'large' : 'medium'"
          class="oc-display-block"
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

<style lang="scss">
.space_info {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  grid-gap: 5px;
}
</style>
