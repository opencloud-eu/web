<template>
  <nav
    class="preview-sidebar flex flex-col p-4 overflow-y-auto"
    aria-label="Media items"
    :aria-busy="isBusy ? 'true' : 'false'"
  >
    <div
      v-for="(item, idx) in items"
      :key="item.resource.id"
      class="flex flex-col items-center p-4 mb-1"
      :class="{ 'bg-role-surface rounded-md': idx === activeIndex }"
    >
      <button
        class="flex items-center justify-center overflow-hidden aspect-video"
        type="button"
        :aria-label="item.resource.name"
        :aria-current="idx === activeIndex ? 'true' : 'false'"
        @click="$emit('select', idx)"
      >
        <img
          v-if="item.cached && item.cached.isImage && item.cached.url && !item.cached.isError"
          :src="item.cached.url"
          class="object-cover w-full h-full rounded-md"
          :alt="item.resource.name"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
        />

        <resource-icon v-else :resource="item.resource" size="large" />
      </button>
      <div class="flex items-center justify-center truncate w-full">
        <span class="truncate" v-text="item.resource.name" />
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { CachedFile } from '../helpers/types'
import { ResourceIcon } from '@opencloud-eu/web-pkg'

export type SidebarItem = {
  resource: Resource
  cached?: CachedFile
}

export default defineComponent({
  name: 'SidebarStackedOverview',
  components: { ResourceIcon },
  props: {
    items: {
      type: Array as PropType<SidebarItem[]>,
      required: true
    },
    activeIndex: {
      type: Number,
      required: true
    },
    isBusy: {
      type: Boolean,
      default: false
    }
  },
  emits: ['select']
})
</script>
