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
      class="oc-resource-icon-link relative"
      :class="{ 'hover:underline': isResourceClickable }"
      @click="emitClick"
    >
      <oc-image
        v-if="hasThumbnail"
        :key="thumbnail"
        v-oc-tooltip="tooltipLabelIcon"
        :src="thumbnail"
        :data-test-thumbnail-resource-name="resource.name"
        class="oc-resource-thumbnail rounded-xs size-8 object-cover"
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
<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import ResourceIcon from './ResourceIcon.vue'
import ResourceLink from './ResourceLink.vue'
import ResourceName from './ResourceName.vue'
import { RouteLocationRaw } from 'vue-router'

/**
 * Displays a resource together with the resource type icon or thumbnail
 */
export default defineComponent({
  name: 'ResourceListItem',
  components: { ResourceIcon, ResourceLink, ResourceName },
  props: {
    /**
     * The resource to be displayed
     */
    resource: {
      type: Object as PropType<Resource>,
      required: true
    },
    /**
     * The prefix that will be shown in the path
     */
    pathPrefix: {
      type: String,
      required: false,
      default: ''
    },
    /**
     * The resource link
     */
    link: {
      type: Object as PropType<RouteLocationRaw>,
      required: false,
      default: null
    },
    /**
     * Asserts whether the resource path should be displayed
     */
    isPathDisplayed: {
      type: Boolean,
      required: false,
      default: false
    },
    /**
     * The resource parent folder link path
     */
    parentFolderLink: {
      type: Object,
      required: false,
      default: null
    },
    /**
     * The resource parent folder name to be displayed
     */
    parentFolderName: {
      type: String,
      required: false,
      default: ''
    },
    /**
     * The resource parent folder link path icon additional attributes
     */
    parentFolderLinkIconAdditionalAttributes: {
      type: Object,
      required: false,
      default: () => ({})
    },
    /**
     * Asserts whether the resource extension should be displayed
     */
    isExtensionDisplayed: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * Asserts whether the resource thumbnail should be displayed
     */
    isThumbnailDisplayed: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * Asserts whether the resource thumbnail should be displayed
     */
    isIconDisplayed: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * Asserts whether clicking on the resource name triggers any action
     */
    isResourceClickable: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  emits: ['click'],
  computed: {
    parentFolderComponentType() {
      return this.parentFolderLink ? 'router-link' : 'span'
    },

    parentFolderLinkIconAttrs() {
      return {
        'fill-type': 'line' as const,
        name: 'folder-2',
        size: 'small' as const,
        ...this.parentFolderLinkIconAdditionalAttributes
      }
    },

    hasThumbnail() {
      return (
        this.isThumbnailDisplayed &&
        Object.prototype.hasOwnProperty.call(this.resource, 'thumbnail')
      )
    },

    thumbnail() {
      return this.resource.thumbnail
    },

    tooltipLabelIcon() {
      if (this.resource.locked) {
        return this.$gettext('This item is locked')
      }
      return null
    }
  },

  methods: {
    emitClick(e: MouseEvent) {
      if (!e || typeof e.stopPropagation !== 'function') {
        return
      }
      /**
       * Triggered when the resource is a file and the name is clicked
       */
      this.$emit('click', e)
    }
  }
})
</script>
