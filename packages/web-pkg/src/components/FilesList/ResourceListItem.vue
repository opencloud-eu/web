<template>
  <div
    class="oc-resource inline-flex justify-start items-center max-w-full overflow-visible"
    :class="{ 'pointer-events-none': !isResourceClickable }"
  >
    <resource-link
      v-if="isIconDisplayed"
      :resource="resource"
      :link="link"
      :is-resource-clickable="isResourceClickable"
      class="contents relative"
      :class="{ 'hover:underline': isResourceClickable }"
      @click="emitClick"
    >
      <oc-image
        v-if="hasThumbnail"
        :key="thumbnail"
        v-oc-tooltip="tooltipLabelIcon"
        :src="thumbnail"
        :data-test-thumbnail-resource-name="resource.name"
        class="rounded-xs size-8 object-cover"
        width="40"
        height="40"
        :aria-label="tooltipLabelIcon"
      />
      <resource-icon
        v-else
        v-oc-tooltip="tooltipLabelIcon"
        :aria-label="tooltipLabelIcon"
        :resource="resource"
      />
    </resource-link>
    <div class="oc-resource-details block truncate" :class="{ 'pl-2': isIconDisplayed }">
      <resource-link
        :resource="resource"
        :is-resource-clickable="isResourceClickable"
        :link="link"
        class="hover:outline-offset-0 focus:outline-offset-0"
        :class="{ 'hover:underline': isResourceClickable }"
        @click="emitClick"
      >
        <resource-name
          :key="resource.name"
          :name="resource.name"
          :path-prefix="pathPrefix"
          :extension="resource.extension"
          :type="resource.type"
          :full-path="resource.path"
          :is-path-displayed="isPathDisplayed"
          :is-extension-displayed="isExtensionDisplayed"
        />
      </resource-link>
      <div class="oc-resource-indicators flex">
        <component
          :is="parentFolderComponentType"
          v-if="isPathDisplayed"
          :to="parentFolderLink"
          class="parent-folder flex items-center truncate px-0.5 mr-2 -ml-0.5 hover:bg-transparent"
          :class="{ 'cursor-pointer': parentFolderLink, 'cursor-default': !parentFolderLink }"
        >
          <oc-icon v-bind="parentFolderLinkIconAttrs" class="mr-1" />
          <span class="text truncate text-sm hover:underline" v-text="parentFolderName" />
        </component>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import ResourceIcon from './ResourceIcon.vue'
import ResourceLink from './ResourceLink.vue'
import ResourceName from './ResourceName.vue'
import { RouteLocationRaw } from 'vue-router'
import { useGettext } from 'vue3-gettext'

const {
  resource,
  pathPrefix = '',
  link = null,
  isPathDisplayed = false,
  parentFolderLink = null,
  parentFolderName = '',
  parentFolderLinkIconAdditionalAttributes = {},
  isExtensionDisplayed = true,
  isThumbnailDisplayed = true,
  isIconDisplayed = true,
  isResourceClickable = true
} = defineProps<{
  resource: Resource
  pathPrefix?: string
  link?: RouteLocationRaw
  isPathDisplayed?: boolean
  parentFolderLink?: RouteLocationRaw
  parentFolderName?: string
  parentFolderLinkIconAdditionalAttributes?: Record<string, unknown>
  isExtensionDisplayed?: boolean
  isThumbnailDisplayed?: boolean
  isIconDisplayed?: boolean
  isResourceClickable?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const { $gettext } = useGettext()

const parentFolderComponentType = computed(() => {
  return parentFolderLink ? 'router-link' : 'span'
})

const parentFolderLinkIconAttrs = computed(() => {
  return {
    'fill-type': 'line' as const,
    name: 'folder-2',
    size: 'small' as const,
    ...parentFolderLinkIconAdditionalAttributes
  }
})

const hasThumbnail = computed(() => {
  return isThumbnailDisplayed && Object.prototype.hasOwnProperty.call(resource, 'thumbnail')
})

const thumbnail = computed(() => resource.thumbnail)

const tooltipLabelIcon = computed(() => {
  if (resource.locked) {
    return $gettext('This item is locked')
  }
  return null
})

const emitClick = (e: MouseEvent) => {
  if (!e || typeof e.stopPropagation !== 'function') {
    return
  }
  emit('click', e)
}
</script>
