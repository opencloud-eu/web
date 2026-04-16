<template>
  <div v-if="currentSpace" class="grid items-center min-w-0 p-0">
    <div class="flex items-center text-sm min-w-0">
      <oc-icon
        name="layout-grid"
        :size="currentSpace.description ? 'large' : 'medium'"
        class="block mr-2 shrink-0"
      />
      <div class="min-w-0">
        <h2
          data-testid="space-info-name"
          class="font-semibold m-0 text-base min-w-0 truncate"
          v-text="currentSpace.name"
        />
        <span
          v-if="currentSpace.description"
          data-testid="space-info-subtitle"
          class="block min-w-0 truncate"
          v-text="currentSpace.description"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'

const { spaceResource = null } = defineProps<{
  spaceResource?: SpaceResource | null
}>()

const injectedResource = inject<SpaceResource | null>('resource', null)

const currentSpace = computed(() => {
  return spaceResource || unref(injectedResource)
})
</script>
