<template>
  <node-view-wrapper class="code-block">
    <div class="text-editor-code-block-language" contenteditable="false">
      <select
        v-model="selectedLanguageValue"
        class="text-editor-code-block-select font-mono"
        :aria-label="$gettext('Code language')"
        :disabled="isReadonly"
      >
        <option v-for="option in languageOptions" :key="option.label" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>
    <span :id="hintId" class="sr-only">
      {{
        $gettext('Press Shift+Enter or press Enter three times in a row to exit the code block.')
      }}
    </span>
    <pre
      role="textbox"
      :aria-describedby="hintId"
      aria-multiline="true"
    ><code><node-view-content /></code></pre>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { useGettext } from 'vue3-gettext'
import { v4 as uuidV4 } from 'uuid'

const props = defineProps(nodeViewProps)
const { $gettext } = useGettext()

const hintId = `code-block-hint-${uuidV4()}`

type LanguageOption = {
  label: string
  value: string
}

const languages = computed<string[]>(() => {
  return props.extension.options.lowlight.listLanguages() as string[]
})

const selectedLanguage = computed<string | null>({
  get() {
    return (props.node.attrs.language as string | null) ?? null
  },
  set(language) {
    props.updateAttributes({ language })
  }
})

const languageOptions = computed<LanguageOption[]>(() => {
  return [
    { label: 'auto', value: '' },
    ...languages.value.map((language) => ({ label: language, value: language }))
  ]
})

const selectedLanguageValue = computed<string>({
  get() {
    return selectedLanguage.value ?? ''
  },
  set(value) {
    selectedLanguage.value = value === '' ? null : value
  }
})

const isReadonly = computed(() => props.editor.isEditable === false)
</script>

<style scoped>
.text-editor-code-block-language {
  position: absolute;
  right: 12px;
  top: 4px;
}

.text-editor-code-block-select:focus {
  box-shadow: none;
  outline: none;
}

.text-editor-code-block-select {
  text-align: right;
  font-size: 12px;
  border: 0;
  background: transparent;
  color: var(--oc-role-on-surface);
}

.text-editor-code-block-select:disabled {
  color: var(--oc-role-on-surface-variant);
  opacity: 0.75;
  cursor: not-allowed;
}
</style>
