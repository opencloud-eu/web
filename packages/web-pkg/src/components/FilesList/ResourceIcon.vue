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
      { 'opacity-80 grayscale': isDisabledSpace, '[&_svg]:h-[70%]': !isSpace && !isFolder }
    ]"
  />
</template>

<script lang="ts">
import { computed, defineComponent, inject, PropType, unref } from 'vue'
import {
  isPersonalSpaceResource,
  isProjectSpaceResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { AVAILABLE_SIZES, SizeType } from '@opencloud-eu/design-system/helpers'
import {
  createDefaultFileIconMapping,
  IconType,
  ResourceIconMapping,
  resourceIconMappingInjectionKey
} from '../../helpers/resource/icon'

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

const defaultFallbackIcon: IconType = {
  name: 'resource-type-file',
  color: 'var(--oc-role-on-surface)'
}

const defaultFileIconMapping = createDefaultFileIconMapping()

export default defineComponent({
  name: 'ResourceIcon',
  props: {
    /**
     * The resource to be displayed
     */
    resource: {
      type: Object as PropType<Resource | SpaceResource>,
      required: true
    },
    /**
     * The size of the icon. Defaults to large.
     * `xsmall, small, medium, large, xlarge, xxlarge`
     */
    size: {
      type: String as PropType<SizeType>,
      default: 'large',
      validator: (value: string): boolean => {
        return AVAILABLE_SIZES.some((e) => e === value)
      }
    }
  },
  setup(props) {
    const iconMappingInjection = inject<ResourceIconMapping>(resourceIconMappingInjectionKey)

    const isFolder = computed(() => {
      if (!!props.resource.extension) {
        return false
      }
      return props.resource.type === 'folder' || props.resource.isFolder
    })

    const isSpace = computed(() => {
      return props.resource.type === 'space'
    })

    const isDisabledSpace = computed(() => {
      return isProjectSpaceResource(props.resource) && props.resource.disabled === true
    })

    const isPersonalSpace = computed(() => {
      return isPersonalSpaceResource(props.resource)
    })
    const extension = computed(() => {
      return props.resource.extension?.toLowerCase()
    })
    const mimeType = computed(() => {
      return props.resource.mimeType?.toLowerCase()
    })

    const icon = computed((): IconType => {
      if (unref(isPersonalSpace)) {
        return defaultPersonalSpaceIcon
      }
      if (unref(isDisabledSpace)) {
        return defaultSpaceIconDisabled
      }
      if (unref(isSpace)) {
        return defaultSpaceIcon
      }
      if (unref(isFolder)) {
        return defaultFolderIcon
      }

      const icon =
        defaultFileIconMapping[unref(extension)] ||
        iconMappingInjection?.mimeType[unref(mimeType)] ||
        iconMappingInjection?.extension[unref(extension)]

      return {
        ...defaultFallbackIcon,
        ...icon
      }
    })

    return {
      icon,
      isSpace,
      isFolder,
      isDisabledSpace
    }
  }
})
</script>
