<template>
  <oc-icon
    :key="`resource-icon-${iconName}`"
    :name="iconName"
    :color="icon.color"
    :size="size ? size : sizeClass ? undefined : 'medium'"
    :size-class="sizeClass"
    :class="[
      'oc-resource-icon',
      'inline-flex',
      'items-center',
      {
        'opacity-80 grayscale': hasDisabledSpaceIcon
      }
    ]"
  />
</template>

<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  isPersonalSpaceResource,
  isProjectSpaceResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { SizeType } from '@opencloud-eu/design-system/helpers'
import {
  createDefaultFileIconMapping,
  getResourceIconName,
  IconType,
  ResourceIconMapping,
  resourceIconMappingInjectionKey
} from '../../helpers'
import { useThemeStore } from '../../composables'

const defaultFolderIcon: IconType = {
  name: 'resource-type-folder'
}

const defaultPersonalSpaceIcon: IconType = {
  name: 'resource-type-folder'
}

const defaultSpaceIcon: IconType = {
  name: 'layout-grid'
}

const defaultFileIcon: IconType = {
  name: 'resource-type-file',
  hasDarkVariant: true
}

const defaultFileIconMapping = createDefaultFileIconMapping()

const {
  resource,
  size = undefined,
  sizeClass = 'size-5'
} = defineProps<{
  resource: Resource | SpaceResource
  /** @deprecated use sizeClass instead */
  size?: SizeType
  sizeClass?: string
}>()

const iconMappingInjection = inject<ResourceIconMapping>(resourceIconMappingInjectionKey)

const { currentTheme } = storeToRefs(useThemeStore())

const hasSpaceIcon = computed(() => {
  return resource.type === 'space'
})

const hasDisabledSpaceIcon = computed(() => {
  return isProjectSpaceResource(resource) && resource.disabled === true
})

const fallbackIcon = computed(() => {
  if (resource.type === 'folder' || resource.isFolder) {
    return defaultFolderIcon
  }
  return defaultFileIcon
})

const hasPersonalSpaceIcon = computed(() => {
  return isPersonalSpaceResource(resource)
})
const extension = computed(() => {
  return resource.extension?.toLowerCase()
})
const mimeType = computed(() => {
  return resource.mimeType?.toLowerCase()
})

const icon = computed((): IconType => {
  if (unref(hasPersonalSpaceIcon)) {
    return defaultPersonalSpaceIcon
  }
  if (unref(hasSpaceIcon)) {
    return defaultSpaceIcon
  }

  const typeIconOrUndefined =
    defaultFileIconMapping[unref(extension)] ||
    iconMappingInjection?.mimeType[unref(mimeType)] ||
    iconMappingInjection?.extension[unref(extension)]

  return typeIconOrUndefined ?? unref(fallbackIcon)
})

const iconName = computed(() => {
  return getResourceIconName(unref(icon), !!unref(currentTheme)?.isDark)
})
</script>
