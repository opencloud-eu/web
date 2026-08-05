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

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'

const {
  href = undefined,
  ariaLabel = undefined,
  description = undefined
} = defineProps<{
  href?: string
  ariaLabel?: string
  description?: string
}>()

const { $gettext } = useGettext()

const hrefOrFallback = computed(() => href || 'https://opencloud.eu/feedback-web')
const ariaLabelOrFallback = computed(() => ariaLabel || $gettext('Share improvement ideas'))
const descriptionOrFallback = computed(() => description || $gettext('Share improvement ideas'))
</script>
