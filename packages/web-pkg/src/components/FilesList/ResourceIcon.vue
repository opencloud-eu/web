<template>
  <oc-icon
    :key="`resource-icon-${imageIcon?.src ?? iconName}`"
    :icon="imageIcon"
    :name="iconName"
    :fill-type="namedIcon?.fillType"
    :color="namedIcon?.color"
    :size="size ? size : sizeClass ? undefined : 'medium'"
    :size-class="sizeClass"
    :unique-ids="uniqueIds"
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
import { ImageIcon, isImageIcon, SizeType } from '@opencloud-eu/design-system/helpers'
import {
  createDefaultFileIconMapping,
  getResourceIconName,
  IconType,
  isVaultSpaceResource,
  ResourceIconMapping,
  resourceIconMappingInjectionKey
} from '../../helpers'
import { useThemeStore } from '../../composables'

const defaultFolderIcon: IconType = {
  name: 'resource-type-folder'
}

const defaultSpaceIcon: IconType = {
  name: 'resource-type-space',
  fillsBox: true,
  uniqueIds: true
}

const vaultSpaceIcon: IconType = {
  name: 'resource-type-space-vault',
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

const icon = computed((): IconType | ImageIcon => {
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

const imageIcon = computed(() => {
  const value = unref(icon)
  return isImageIcon(value) ? value : undefined
})

const namedIcon = computed(() => {
  const value = unref(icon)
  return isImageIcon(value) ? undefined : value
})

const iconName = computed(() => {
  if (!unref(namedIcon)) {
    return undefined
  }
  return getResourceIconName(unref(namedIcon), !!unref(currentTheme)?.isDark)
})

const fillsBox = computed(() => unref(namedIcon)?.fillsBox === true)

const uniqueIds = computed(() => unref(namedIcon)?.uniqueIds === true)
</script>
