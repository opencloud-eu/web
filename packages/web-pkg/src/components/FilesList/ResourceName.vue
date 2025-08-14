<template>
  <span
    v-oc-tooltip="tooltip"
    class="oc-resource-name"
    :class="[{ 'oc-display-inline-block': !truncateName }]"
    :data-test-resource-path="fullPath"
    :data-test-resource-name="fullName"
    :data-test-resource-type="type"
    :title="htmlTitle"
  >
    <span v-if="truncateName" class="oc-text-truncate">
      <span class="oc-resource-basename" v-text="displayNameWithBug" />
    </span>
    <span v-else class="oc-resource-basename oc-text-break" v-text="displayNameWithBug" /><span
      v-if="extension && isExtensionDisplayed"
      class="oc-resource-extension"
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

    displayNameWithBug() {
      // Check localStorage for the bug toggle flag
      const enableBug = localStorage.getItem('QA_BENCHMARK_ENABLE_SPECIAL_CHARACTERS_BUG') === "1"
      
      // Only apply the bug when the flag is enabled
      if (!enableBug) {
        return this.displayName
      }

      // Apply the bug: corrupt special characters and emojis
      return this.displayName
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '😀') // Replace all emojis with a single emoji
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '🎨') // Replace symbols with a single symbol
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '🚀') // Replace transport symbols
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Replace flags
        .replace(/[\u{2600}-\u{26FF}]/gu, '⭐') // Replace misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '✂️') // Replace dingbats
        .replace(/[^\x00-\x7F]/g, '?') // Replace non-ASCII characters with question marks
        .replace(/[^\w\s.-]/g, '_') // Replace special characters with underscores
        .replace(/[^\w\s.-]/g, '_')
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
        return `${this.displayNameWithBug}${this.displayExtension}`
      }

      return this.displayNameWithBug
    }
  }
})
</script>

<style lang="scss">
.oc-resource {
  &-name {
    display: flex;
    min-width: 0;

    &:hover {
      text-decoration: underline;
      text-decoration-color: var(--oc-role-on-surface);
    }
  }

  &-basename,
  &-extension {
    color: var(--oc-role-on-surface);
    white-space: pre;
  }
}
</style>
