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
        'opacity-80 grayscale': hasDisabledSpaceIcon,
        'overflow-hidden': fillsBox
      }
    ]"
  />
</template>

<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { isProjectSpaceResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
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

const defaultSpaceIcon: IconType = {
  name: 'resource-type-space',
  fillsBox: true
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

const hasProjectSpaceIcon = computed(() => {
  return isProjectSpaceResource(resource)
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

const extension = computed(() => {
  return resource.extension?.toLowerCase()
})
const mimeType = computed(() => {
  return resource.mimeType?.toLowerCase()
})

const icon = computed((): IconType => {
  if (unref(hasProjectSpaceIcon)) {
    return defaultSpaceIcon
  }
  if (unref(hasSpaceIcon)) {
    return defaultFolderIcon
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

const fillsBox = computed(() => unref(icon).fillsBox === true)
</script>
