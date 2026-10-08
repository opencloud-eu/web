<template>
  <oc-icon
    :key="`resource-icon-${iconKey}`"
    :icon="icon"
    :size="size ? size : sizeClass ? undefined : 'medium'"
    :size-class="sizeClass"
    :unique-ids="icon === defaultSpaceIcon"
    :class="[
      'oc-resource-icon',
      'inline-flex',
      'items-center',
      {
        'opacity-80 grayscale': hasDisabledSpaceIcon,
        'overflow-hidden': hasProjectSpaceIcon
      }
    ]"
  />
</template>

<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import { isProjectSpaceResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { Icon, isImageIcon, SizeType } from '@opencloud-eu/design-system/helpers'
import {
  createDefaultFileIconMapping,
  isVaultSpaceResource,
  ResourceIconMapping,
  resourceIconMappingInjectionKey
} from '../../helpers'

const defaultFolderIcon = 'resource-type-folder'
const defaultSpaceIcon = 'resource-type-space'
const vaultSpaceIcon = 'resource-type-space-vault'
const defaultFileIcon = 'resource-type-file'

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

const hasSpaceIcon = computed(() => {
  return resource.type === 'space'
})

const hasProjectSpaceIcon = computed(() => {
  return isProjectSpaceResource(resource)
})

const hasVaultSpaceIcon = computed(() => {
  return isVaultSpaceResource(resource)
})

const hasDisabledSpaceIcon = computed(() => {
  return isProjectSpaceResource(resource) && resource.disabled === true
})

const isFolder = computed(() => {
  return resource.type === 'folder' || resource.isFolder
})

const fallbackIcon = computed(() => {
  if (unref(isFolder)) {
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

const icon = computed((): Icon => {
  if (unref(hasProjectSpaceIcon)) {
    if (unref(hasVaultSpaceIcon)) {
      return vaultSpaceIcon
    }
    return defaultSpaceIcon
  }
  if (unref(hasSpaceIcon)) {
    return defaultFolderIcon
  }

  if (unref(isFolder)) {
    return iconMappingInjection?.folderExtension?.[unref(extension)] ?? unref(fallbackIcon)
  }

  const typeIconOrUndefined =
    defaultFileIconMapping[unref(extension)] ||
    iconMappingInjection?.mimeType[unref(mimeType)] ||
    iconMappingInjection?.extension[unref(extension)]

  return typeIconOrUndefined ?? unref(fallbackIcon)
})

const iconKey = computed(() => {
  const value = unref(icon)
  if (typeof value === 'string') {
    return value
  }
  return isImageIcon(value) ? value.src : value.name
})
</script>
