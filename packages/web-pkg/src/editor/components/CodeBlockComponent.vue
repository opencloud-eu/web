<template>
  <node-view-wrapper class="code-block">
    <div class="text-editor-code-block-language" contenteditable="false">
      <oc-select
        class="text-editor-code-block-select"
        :model-value="selectedLanguageOption"
        :options="languageOptions"
        :disabled="isReadonly"
        option-label="label"
        :clearable="false"
        :searchable="true"
        :label="$gettext('Code language')"
        :label-hidden="true"
        @update:model-value="updateSelectedLanguage"
      />
    </div>
    <span :id="hintId" class="sr-only">
      {{ $gettext('Press Shift+Enter to exit the code block.') }}
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
  value: string | null
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
    { label: 'auto', value: null },
    ...languages.value.map((language) => ({ label: language, value: language }))
  ]
})

const selectedLanguageOption = computed<LanguageOption>(() => {
  const current = selectedLanguage.value
  return languageOptions.value.find(({ value }) => value === current) ?? languageOptions.value[0]
})

const isReadonly = computed(() => props.editor.isEditable === false)

function updateSelectedLanguage(option: LanguageOption | null) {
  selectedLanguage.value = option?.value ?? null
}
</script>

<style scoped>
.text-editor-code-block-language {
  position: absolute;
  right: 12px;
  top: 4px;
  min-width: 130px;
  max-width: calc(100% - 24px);
}

.text-editor-code-block-select :deep(.vs__dropdown-toggle) {
  min-height: 30px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
</style>
