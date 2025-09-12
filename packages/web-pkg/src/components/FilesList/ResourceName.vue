<template>
  <span
    v-oc-tooltip="tooltip"
    class="oc-resource-name flex min-w-0"
    :class="[{ 'inline-block': !truncateName }]"
    :data-test-resource-path="fullPath"
    :data-test-resource-name="fullName"
    :data-test-resource-type="type"
    :title="htmlTitle"
  >
    <span v-if="truncateName" class="truncate">
      <span class="oc-resource-basename whitespace-pre text-role-on-surface" v-text="displayName" />
    </span>
    <span
      v-else
      class="oc-resource-basename break-normal text-role-on-surface"
      v-text="displayName"
    /><span
      v-if="extension && isExtensionDisplayed"
      class="oc-resource-extension whitespace-pre text-role-on-surface"
      v-text="displayExtension"
    />
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import path from 'path'

export default defineComponent({
  name: 'ResourceName',
  props: {
    /**
     * The name of the resource
     */
    name: {
      type: String,
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
     * The extension of the resource, if there is one
     */
    extension: {
      type: String,
      required: false,
      default: ''
    },
    /**
     * The type of the resource
     */
    type: {
      type: String,
      required: true
    },
    /**
     * A full path of the resource
     */
    fullPath: {
      type: String,
      required: true
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
     * Asserts whether the resource extension should be displayed
     */
    isExtensionDisplayed: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * Asserts whether the resource name should be truncated if it's too long
     */
    truncateName: {
      type: Boolean,
      required: false,
      default: true
    }
  },

  computed: {
    tooltip() {
      return this.pathTooltip
    },

    fullName() {
      return (this.displayPath || '') + this.name
    },

    displayName() {
      if (this.extension) {
        return this.name.slice(0, -this.extension.length - 1)
      }
      return this.name
    },

    displayExtension() {
      return this.extension ? '.' + this.extension : ''
    },

    displayPath() {
      if (!this.isPathDisplayed) {
        return null
      }
      const pathSplit = this.fullPath.replace(/^\//, '').split('/')
      if (pathSplit.length < 2) {
        return null
      }
      if (pathSplit.length === 2) {
        return pathSplit[0] + '/'
      }
      return `…/${pathSplit[pathSplit.length - 2]}/`
    },

    pathTooltip() {
      if (!this.isPathDisplayed) {
        return null
      }
      if (this.displayPath === this.fullPath) {
        return null
      }
      if (this.pathPrefix) {
        return path.join(this.pathPrefix, this.fullPath)
      }
      return this.fullPath
    },

    htmlTitle() {
      if (this.tooltip) {
        return
      }

      if (this.isExtensionDisplayed) {
        return `${this.displayName}${this.displayExtension}`
      }

      return this.displayName
    }
  }
})
</script>
