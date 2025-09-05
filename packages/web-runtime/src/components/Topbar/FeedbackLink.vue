<template>
  <div class="flex">
    <oc-button
      v-oc-tooltip="descriptionOrFallback"
      type="a"
      :href="hrefOrFallback"
      target="_blank"
      appearance="raw-inverse"
      color-role="chrome"
      :aria-label="ariaLabelOrFallback"
      aria-describedby="oc-feedback-link-description"
      no-hover
    >
      <oc-icon name="feedback" fill-type="line" />
    </oc-button>
    <p id="oc-feedback-link-description" class="sr-only" v-text="descriptionOrFallback" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'FeedbackLink',
  props: {
    href: {
      type: String,
      required: false,
      default: null
    },
    ariaLabel: {
      type: String,
      required: false,
      default: null
    },
    description: {
      type: String,
      required: false,
      default: null
    }
  },
  computed: {
    hrefOrFallback() {
      return this.href || 'https://opencloud.eu/feedback-web'
    },
    ariaLabelOrFallback() {
      return this.ariaLabel || this.$gettext('Share improvement ideas')
    },
    descriptionOrFallback() {
      return this.description || this.$gettext('Share improvement ideas')
    }
  }
})
</script>
