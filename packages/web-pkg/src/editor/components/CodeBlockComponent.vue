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
    <pre><code><node-view-content /></code></pre>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed, unref, watch } from 'vue'
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '../../composables'
import atomOneDarkThemeUrl from 'highlight.js/styles/atom-one-dark.css?url'
import atomOneLightThemeUrl from 'highlight.js/styles/atom-one-light.css?url'

const props = defineProps(nodeViewProps)
const { $gettext } = useGettext()
const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)

type LanguageOption = {
  label: string
  value: string | null
}

const isDarkTheme = computed(() => unref(currentTheme)?.isDark)
const hljsThemeStylesheetId = 'oc-text-editor-hljs-theme'

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
  if (unref(isReadonly)) {
    return
  }

  selectedLanguage.value = option?.value ?? null
}

watch(
  isDarkTheme,
  (isDark) => {
    if (typeof document === 'undefined') {
      return
    }

    let stylesheet = document.getElementById(hljsThemeStylesheetId) as HTMLLinkElement | null
    if (!stylesheet) {
      stylesheet = document.createElement('link')
      stylesheet.id = hljsThemeStylesheetId
      stylesheet.rel = 'stylesheet'
      document.head.appendChild(stylesheet)
    }

    stylesheet.href = isDark ? atomOneDarkThemeUrl : atomOneLightThemeUrl
  },
  { immediate: true }
)
</script>
