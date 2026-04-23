<template>
  <div class="text-editor-provider">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import type { TextEditorInstance } from '../types'

const props = defineProps<{
  editor: TextEditorInstance
}>()

provide('textEditor', props.editor)
</script>
