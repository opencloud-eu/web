<template>
  <div v-if="currentSpace" class="flex items-center min-w-0 ml-2">
    <oc-icon name="layout-grid" size="small" class="mr-2 shrink-0" />
    <h2
      data-testid="space-info-name"
      class="font-semibold m-0 text-base min-w-0 flex-1 truncate"
      v-text="currentSpace.name"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'

const { spaceResource = null } = defineProps<{
  spaceResource?: SpaceResource | null
}>()

const resource = inject<SpaceResource | null>('resource', null)
const space = inject<SpaceResource | null>('space', null)

const currentSpace = computed(() => {
  return spaceResource || unref(resource) || unref(space)
})
</script>
