<template>
  <oc-icon
    :key="`resource-icon-${icon.name}`"
    :name="icon.name"
    :color="icon.color"
    :size="size"
    :class="[
      'oc-resource-icon',
      'inline-flex',
      'items-center',
      {
        'opacity-80 grayscale': hasDisabledSpaceIcon,
        '[&_svg]:h-[70%]': !hasSpaceIcon && !hasFolderIcon
      }
    ]"
  />
</template>

<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import {
  isPersonalSpaceResource,
  isProjectSpaceResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { SizeType } from '@opencloud-eu/design-system/helpers'
import {
  createDefaultFileIconMapping,
  IconType,
  ResourceIconMapping,
  resourceIconMappingInjectionKey
} from '../../helpers'

const defaultFolderIcon: IconType = {
  name: 'resource-type-folder',
  color: 'var(--oc-color-icon-folder)'
}

const defaultPersonalSpaceIcon: IconType = {
  name: 'resource-type-folder',
  color: 'var(--oc-role-secondary)'
}

const defaultSpaceIcon: IconType = {
  name: 'layout-grid',
  color: 'var(--oc-role-secondary)'
}

const defaultSpaceIconDisabled: IconType = {
  name: 'layout-grid',
  color: 'var(--oc-role-secondary)'
}

const defaultFileIcon: IconType = {
  name: 'resource-type-file',
  color: 'var(--oc-role-on-surface)'
}

const defaultFileIconMapping = createDefaultFileIconMapping()

const { resource, size = 'large' } = defineProps<{
  resource: Resource | SpaceResource
  size?: SizeType
}>()

const iconMappingInjection = inject<ResourceIconMapping>(resourceIconMappingInjectionKey)

const hasFolderIcon = computed(() => {
  return unref(icon)?.name === defaultFolderIcon.name
})

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
  if (unref(hasDisabledSpaceIcon)) {
    return defaultSpaceIconDisabled
  }
  if (unref(hasSpaceIcon)) {
    return defaultSpaceIcon
  }

  const typeIconOrUndefined =
    defaultFileIconMapping[unref(extension)] ||
    iconMappingInjection?.mimeType[unref(mimeType)] ||
    iconMappingInjection?.extension[unref(extension)]

  return {
    ...unref(fallbackIcon),
    ...typeIconOrUndefined
  }
})
</script>
