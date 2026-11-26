<template>
  <oc-textarea
    v-model="text"
    class="pdf-viewer-comment-input"
    rows="4"
    :label="$gettext('Comment')"
  />
</template>

<script setup lang="ts">
import { ref, unref, watch } from 'vue'
import type { Modal } from '@opencloud-eu/web-pkg'

const { comment = '', onSave } = defineProps<{
  modal: Modal
  comment?: string
  onSave: (text: string) => Promise<void> | void
}>()

const emit = defineEmits<{ 'update:confirmDisabled': [value: boolean] }>()

const text = ref(comment)

// Like in the PDF.js viewer, saving needs a change.
watch(text, (value) => emit('update:confirmDisabled', value === comment), { immediate: true })

async function onConfirm() {
  if (unref(text) === comment) {
    return
  }
  await onSave(unref(text))
}

defineExpose({ onConfirm })
</script>
