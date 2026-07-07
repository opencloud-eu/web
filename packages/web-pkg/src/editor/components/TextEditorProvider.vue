<template>
  <div class="text-editor-provider h-full flex flex-col">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide, toRef } from 'vue'
import type { TextEditorInstance } from '../types'

const props = defineProps<{
  editor: TextEditorInstance
  actionsToDisplay?: string[]
  toolbarCompact?: boolean
}>()

provide('textEditor', props.editor)
provide('textEditorActionsToDisplay', toRef(props, 'actionsToDisplay'))
provide('textEditorToolbarCompact', toRef(props, 'toolbarCompact'))
</script>
