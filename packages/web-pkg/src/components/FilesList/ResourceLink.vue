<template>
  <component
    :is="isNavigatable ? 'router-link' : 'oc-button'"
    v-if="isResourceClickable"
    :to="isNavigatable ? link : undefined"
    :target="isNavigatable ? linkTarget : undefined"
    :rel="isNavigatable && linkTarget === '_blank' ? 'noopener noreferrer' : undefined"
    :appearance="!isNavigatable ? 'raw' : undefined"
    :gap-size="!isNavigatable ? 'none' : undefined"
    :justify-content="!isNavigatable ? 'left' : undefined"
    :type="!isNavigatable ? 'button' : undefined"
    :no-hover="!isNavigatable ? true : undefined"
    :draggable="false"
    class="oc-resource-link max-w-full inline-flex"
    @dragstart.prevent.stop
    @click="emitClick"
  >
    <slot />
  </component>
  <span v-else class="inline-flex">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { isSpaceResource, Resource } from '@opencloud-eu/web-client'
import { useConfigStore } from '../../composables'
import { storeToRefs } from 'pinia'
import { computed, unref } from 'vue'
import { RouteLocationRaw } from 'vue-router'

const {
  resource,
  link = undefined,
  isResourceClickable = true
} = defineProps<{
  resource: Resource
  link?: RouteLocationRaw
  isResourceClickable?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

defineSlots<{
  default?: () => any
}>()

const configStore = useConfigStore()
const { options } = storeToRefs(configStore)

const linkTarget = computed(() => {
  return unref(options).openFilesInNewTab && link && !resource.isFolder ? '_blank' : '_self'
})

const isNavigatable = computed(() => {
  if (!resource || (isSpaceResource(resource) && resource.disabled)) {
    return false
  }
  return !!link
})

function emitClick(e: MouseEvent) {
  if (!e || typeof e.stopPropagation !== 'function') {
    return
  }
  if (unref(isNavigatable)) {
    return
  }
  emit('click', e)
}
</script>
