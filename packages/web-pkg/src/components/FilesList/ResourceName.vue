<template>
  <span
    v-oc-tooltip="pathTooltip"
    class="oc-resource-name flex min-w-0"
    :class="[{ 'inline-block': !truncateName }]"
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
      v-if="extension && isExtensionDisplayed"
      class="oc-resource-extension whitespace-pre text-role-on-surface leading-4"
      v-text="displayExtension"
    />
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
  truncateName = true
} = defineProps<{
  name: string
  type: string
  fullPath: string
  pathPrefix?: string
  extension?: string
  isPathDisplayed?: boolean
  isExtensionDisplayed?: boolean
  truncateName?: boolean
}>()

const displayName = computed(() => {
  if (extension) {
    return name.slice(0, -extension.length - 1)
  }
  return name
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
