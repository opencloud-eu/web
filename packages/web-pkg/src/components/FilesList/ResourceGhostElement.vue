<template>
  <div id="ghost-element" class="z-[var(--z-index-modal)] absolute pt-1 pl-4 bg-transparent">
    <div class="relative rounded-sm bg-role-surface-container-high">
      <resource-icon class="p-1" :resource="previewItems[0]" />
      <div
        v-if="showSecondLayer"
        class="-z-10 absolute top-[3px] left-[3px] right-[-3px] bottom-[-3px] rounded-sm bg-role-surface-container-high brightness-82"
      />
      <div
        v-if="showThirdLayer"
        class="-z-20 absolute top-[6px] left-[6px] right-[-6px] bottom-[-6px] rounded-sm bg-role-surface-container-high brightness-72"
      />
    </div>
    <span
      class="badge absolute top-[-2px] right-[-8px] p-1 text-sm text-center leading-2 bg-red-600 text-white rounded-4xl box-content min-w-2 h-2"
      >{{ itemCount }}</span
    >
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import ResourceIcon from './ResourceIcon.vue'

/**
 * Please head to the OpenCloud web ResourceTable component (https://github.com/opencloud-eu/web/blob/main/packages/web-app-files/src/components/FilesList/ResourceTable.vue) for a demo of the Ghost Element.
 */
export default defineComponent({
  name: 'ResourceGhostElement',
  components: { ResourceIcon },
  props: {
    previewItems: {
      type: Array as PropType<Resource[]>,
      required: true
    }
  },
  computed: {
    layerCount() {
      return Math.min(this.previewItems.length, 3)
    },
    showSecondLayer() {
      return this.layerCount > 1
    },
    showThirdLayer() {
      return this.layerCount > 2
    },
    itemCount() {
      return this.previewItems.length
    }
  }
})
</script>
