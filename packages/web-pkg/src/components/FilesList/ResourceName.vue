<template>
  <span
    v-oc-tooltip="pathTooltip"
    class="oc-resource-name flex items-center min-w-0"
    :data-test-resource-path="fullPath"
    :data-test-resource-name="fullName"
    :data-test-resource-type="type"
    :title="htmlTitle"
  >
    <span v-if="truncateName" class="truncate leading-4">
      <span class="oc-resource-basename whitespace-pre text-role-on-surface" v-text="displayName" />
    </span>
    <span
      v-else
      class="oc-resource-basename break-normal text-role-on-surface leading-4"
      v-text="displayName"
    /><span
      v-if="showExtension"
      class="oc-resource-extension whitespace-pre text-role-on-surface leading-4"
      v-text="displayExtension"
    />
    <oc-icon v-if="isFavorite" name="star" fill-type="line" class="oc-resource-favorite ml-1" />
  </span>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import path from 'path'

const {
  name,
  type,
  fullPath,
  pathPrefix = '',
  extension = '',
  isPathDisplayed = false,
  isExtensionDisplayed = true,
  truncateName = true,
  isFavorite = false
} = defineProps<{
  name: string
  type: string
  fullPath: string
  pathPrefix?: string
  extension?: string
  isPathDisplayed?: boolean
  isExtensionDisplayed?: boolean
  truncateName?: boolean
  isFavorite?: boolean
}>()

const displayName = computed(() => {
  if (extension && !name.startsWith('.')) {
    return name.slice(0, -extension.length - 1)
  }
  return name
})

const showExtension = computed(() => {
  return extension && isExtensionDisplayed && !name.startsWith('.')
})

const displayExtension = computed(() => {
  return extension ? '.' + extension : ''
})

const displayPath = computed(() => {
  if (!isPathDisplayed) {
    return null
  }
  const pathSplit = fullPath.replace(/^\//, '').split('/')
  if (pathSplit.length < 2) {
    return null
  }
  if (pathSplit.length === 2) {
    return pathSplit[0] + '/'
  }
  return `…/${pathSplit[pathSplit.length - 2]}/`
})

const pathTooltip = computed(() => {
  if (!isPathDisplayed) {
    return null
  }
  if (unref(displayPath) === fullPath) {
    return null
  }
  if (pathPrefix) {
    return path.join(pathPrefix, fullPath)
  }
  return fullPath
})

const htmlTitle = computed(() => {
  if (unref(pathTooltip)) {
    return undefined
  }

  if (isExtensionDisplayed) {
    return `${unref(displayName)}${unref(displayExtension)}`
  }

  return unref(displayName)
})

const fullName = computed(() => {
  return (unref(displayPath) || '') + name
})
</script>

<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-resource-favorite,
  .oc-resource-favorite svg {
    @apply !w-[14px] !h-[14px];
  }
}
</style>
