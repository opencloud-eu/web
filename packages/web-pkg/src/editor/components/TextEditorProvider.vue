<template>
  <div class="text-editor-provider h-full flex flex-col">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide, toRef } from 'vue'
import type { TextEditorInstance, TextEditorToolbarVariant } from '../types'

const props = defineProps<{
  editor: TextEditorInstance
  toolbarVariant?: TextEditorToolbarVariant
}>()

provide('textEditor', props.editor)
provide('textEditorToolbarVariant', toRef(props, 'toolbarVariant'))
</script>
