<template>
  <div class="text-editor-provider h-full flex flex-col">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import type { TextEditorInstance } from '../types'

const { editor } = defineProps<{
  editor: TextEditorInstance
}>()

provide('textEditor', editor)
</script>
