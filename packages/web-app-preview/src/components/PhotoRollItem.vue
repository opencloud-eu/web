<template>
  <div
    ref="photoRollItem"
    class="flex flex-col items-center p-4 mb-1 photo-roll-item"
    :class="{ 'bg-role-secondary-container rounded-md': isActive }"
  >
    <oc-button
      appearance="raw"
      class="flex flex-col w-full"
      :aria-label="item.name"
      no-hover
      :aria-current="isActive ? 'true' : 'false'"
      @click="$emit('select')"
    >
      <img
        v-if="item && item.resource.thumbnail"
        :src="item.resource.thumbnail"
        class="object-cover h-25 rounded-md aspect-video"
        :alt="item.name"
        referrerpolicy="no-referrer"
      />
      <div v-else class="aspect-video h-25 flex items-center justify-center">
        <resource-icon class="aspect-video" :resource="iconResource" size="xlarge" />
      </div>
      <span class="w-full">
        <resource-name
          :name="item.resource.name"
          :extension="item.resource.extension"
          :type="item.resource.type"
          :full-path="item.resource.webDavPath"
          :is-extension-displayed="areFileExtensionsShown"
          :is-path-displayed="false"
          :truncate-name="false"
          :is-favorite="item.resource.starred"
          class="[&_span]:break-all justify-center"
        />
      </span>
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { Resource } from '@opencloud-eu/web-client'
import { MediaFile } from '../helpers/types'
import {
  ResourceIcon,
  ResourceName,
  useResourcesStore,
  VisibilityObserver
} from '@opencloud-eu/web-pkg'
import { ref, computed, onMounted, onBeforeUnmount, useTemplateRef, unref } from 'vue'

const visibilityObserver = new VisibilityObserver()

const props = defineProps<{
  item: MediaFile
  isActive: boolean
}>()

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'item-visible'): void
}>()

const resourcesStore = useResourcesStore()
const itemRef = useTemplateRef<HTMLElement>('photoRollItem')
const hasEmittedVisible = ref(false)

const areFileExtensionsShown = computed(() => resourcesStore.areFileExtensionsShown)

const iconResource = computed(() => {
  return {
    id: props.item.id,
    path: '',
    extension: props.item.ext,
    mimeType: props.item.mimeType,
    isFolder: false,
    isFile: true,
    type: 'file'
  } as Resource
})

onMounted(() => {
  if (!itemRef.value) return

  visibilityObserver.observe(itemRef.value, {
    onEnter: ({ unobserve }) => {
      if (unref(hasEmittedVisible)) {
        return
      }

      hasEmittedVisible.value = true
      emit('item-visible')
      unobserve()
    }
  })
})

onBeforeUnmount(() => {
  visibilityObserver.disconnect()
})
</script>
