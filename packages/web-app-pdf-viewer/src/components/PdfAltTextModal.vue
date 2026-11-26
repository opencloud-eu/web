<template>
  <div class="pdf-viewer-alt-text flex flex-col gap-3">
    <p class="text-sm" v-text="$gettext('Describe the image for people who can’t see it.')" />
    <oc-checkbox
      v-model="isDecorative"
      class="pdf-viewer-alt-text-decorative"
      :label="$gettext('Decorative image, no description needed')"
    />
    <oc-textarea
      v-model="text"
      class="pdf-viewer-alt-text-input"
      :label="$gettext('Description')"
      :disabled="isDecorative"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, unref } from 'vue'
import type { Modal } from '@opencloud-eu/web-pkg'

export type AltTextData = { altText: string; decorative: boolean }

const {
  altText = '',
  decorative = false,
  onSave
} = defineProps<{
  modal: Modal
  altText?: string
  decorative?: boolean
  onSave: (data: AltTextData) => Promise<void> | void
}>()

const text = ref(altText)
const isDecorative = ref(decorative)

async function onConfirm() {
  await onSave({
    altText: unref(isDecorative) ? '' : unref(text).trim(),
    decorative: unref(isDecorative)
  })
}

defineExpose({ onConfirm })
</script>
