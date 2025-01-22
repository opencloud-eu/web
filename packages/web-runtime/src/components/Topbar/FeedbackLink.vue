<template>
  <div class="oc-flex">
    <oc-button
      v-oc-tooltip="descriptionOrFallback"
      type="a"
      :href="hrefOrFallback"
      target="_blank"
      appearance="raw-inverse"
      variation="primary"
      :aria-label="ariaLabelOrFallback"
      aria-describedby="oc-feedback-link-description"
    >
      <oc-icon name="feedback" />
    </oc-button>
    <p id="oc-feedback-link-description" class="oc-invisible-sr" v-text="descriptionOrFallback" />
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
      return this.href || 'https://opencloud.eu'
    },
    ariaLabelOrFallback() {
      return this.ariaLabel || this.$gettext('OpenCloud feedback survey')
    },
    descriptionOrFallback() {
      return (
        this.description ||
        this.$gettext(
          "Provide your feedback: We'd like to improve the web design and would be happy to hear your feedback. Thank you! Your OpenCloud team."
        )
      )
    }
  }
})
</script>
