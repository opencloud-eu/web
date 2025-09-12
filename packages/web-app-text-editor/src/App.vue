<template>
  <div
    class="oc-text-editor size-full"
    :class="{
      'p-4 overflow-auto': isReadOnly
    }"
  >
    <text-editor-component
      :resource="resource"
      :application-config="applicationConfig"
      :current-content="currentContent"
      :is-read-only="isReadOnly"
      @update:current-content="$emit('update:currentContent', $event)"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { AppConfigObject, TextEditor as TextEditorComponent } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'TextEditor',
  components: { TextEditorComponent },
  props: {
    applicationConfig: { type: Object as PropType<AppConfigObject>, required: true },
    currentContent: {
      type: String,
      required: true
    },
    isReadOnly: { type: Boolean, required: false },
    resource: { type: Object as PropType<Resource>, required: true }
  },
  emits: ['update:currentContent']
})
</script>
