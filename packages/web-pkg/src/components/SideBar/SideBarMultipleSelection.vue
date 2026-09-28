<template>
  <div class="sidebar-multiple-selection flex flex-col p-2">
    <div
      class="flex justify-center items-center p-4 mb-4 bg-role-surface-container rounded-xl"
      data-testid="sidebar-multiple-selection-image"
    >
      <inline-svg
        :src="imgSrcWithVersion"
        class="sidebar-multiple-selection-image"
        width="160"
        height="160"
        aria-hidden="true"
      />
    </div>
    <oc-definition-list
      v-if="details.length"
      :aria-label="detailsLabel"
      :items="details"
      class="m-0"
    />
    <div
      class="flex items-center gap-2 mt-4 p-3 bg-role-surface-container-low rounded-sm text-role-on-surface-variant"
    >
      <oc-icon name="information" fill-type="line" class="shrink-0" />
      <p class="m-0" data-testid="sidebar-multiple-selection-message" v-text="message" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InlineSvg from 'vue-inline-svg'
import { addVersionToAssetUrl } from '@opencloud-eu/design-system/helpers'

const {
  imgSrc,
  message,
  details = [],
  detailsLabel = ''
} = defineProps<{
  imgSrc: string
  message: string
  details?: { term: string; definition: string }[]
  detailsLabel?: string
}>()

const imgSrcWithVersion = computed(() => addVersionToAssetUrl(imgSrc))
</script>

<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .sidebar-multiple-selection-image :deep(.background-splash) {
    fill: var(--oc-role-surface-container-highest);
  }
}
</style>
