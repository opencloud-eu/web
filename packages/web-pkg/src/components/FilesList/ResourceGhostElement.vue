<template>
  <div id="ghost-element" class="z-[var(--z-index-modal)] absolute pt-2 pe-2 pb-2 ps-4">
    <div
      class="relative flex items-center gap-2 w-50 h-10 px-3 rounded-md bg-role-surface-container-high"
    >
      <resource-icon class="shrink-0" :resource="previewItems[0]" size-class="size-6" />
      <span
        class="resource-ghost-element-name truncate text-sm text-role-on-surface"
        v-text="displayName"
      />
      <div
        v-if="showSecondLayer"
        class="-z-10 absolute top-[3px] inset-s-[3px] inset-e-[-3px] bottom-[-3px] rounded-md bg-role-surface-container-high brightness-82"
      />
      <div
        v-if="showThirdLayer"
        class="-z-20 absolute top-[6px] inset-s-[6px] inset-e-[-6px] bottom-[-6px] rounded-md bg-role-surface-container-high brightness-72"
      />
    </div>
    <span
      class="badge absolute top-0 inset-e-0 p-1 text-sm text-center leading-2 bg-role-secondary text-role-on-secondary rounded-4xl box-content min-w-2 h-2"
      >{{ itemCount }}</span
    >
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { Resource } from '@opencloud-eu/web-client'
import ResourceIcon from './ResourceIcon.vue'
import { useResourcesStore } from '../../composables/piniaStores'
import { withoutExtension } from '../../helpers/fileExtension'

const { previewItems } = defineProps<{
  previewItems: Resource[]
}>()

const layerCount = computed(() => Math.min(previewItems.length, 3))
const showSecondLayer = computed(() => layerCount.value > 1)
const showThirdLayer = computed(() => layerCount.value > 2)
const itemCount = computed(() => previewItems.length)

const { areFileExtensionsShown } = storeToRefs(useResourcesStore())

// like the file list: hide the extension of files (not of dotfiles) when the setting is off
const displayName = computed(() => {
  const { name, type, extension } = previewItems[0]
  if (unref(areFileExtensionsShown) || type !== 'file' || !extension || name.startsWith('.')) {
    return name
  }
  return withoutExtension(name, extension)
})
</script>
