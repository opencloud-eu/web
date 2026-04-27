<template>
  <div
    id="text-editor-container"
    class="h-full [&_.md-editor-preview]:!font-(family-name:--oc-font-family)"
  >
    <article v-if="isReadOnly">
      <md-preview
        id="text-editor-preview-component"
        :model-value="currentContent"
        no-katex
        no-mermaid
        no-prettier
        no-upload-img
        no-highlight
        no-echarts
        :language="languages[language.current] || 'en-US'"
        :theme="theme"
        auto-focus
        read-only
      />
    </article>
    <md-editor
      v-else
      id="text-editor-component"
      :class="{ 'no-line-numbers': !showLineNumbers }"
      class="[&_.cm-content]:!font-(family-name:--oc-font-family)"
      :model-value="currentContent"
      no-katex
      no-mermaid
      no-prettier
      no-highlight
      no-echarts
      :on-upload-img="onUploadImg"
      :language="languages[language.current] || 'en-US'"
      :theme="theme"
      :preview="isMarkdown"
      :toolbars="toolbars"
      auto-focus
      @on-change="(value: string) => $emit('update:currentContent', value)"
    >
      <template #defToolbars>
        <NormalToolbar
          :title="showLineNumbers ? $gettext('hide line numbers') : $gettext('show line numbers')"
          @on-click="showLineNumbers = !showLineNumbers"
        >
          <oc-icon
            class="!flex items-center justify-center size-6"
            size="small"
            name="hashtag"
            fill-type="none"
          />
        </NormalToolbar>
      </template>
    </md-editor>
  </div>
</template>

<script setup lang="ts">
import { computed, unref, ref } from 'vue'
import { Resource } from '@opencloud-eu/web-client'

import { config, MdEditor, MdPreview, XSSPlugin, NormalToolbar, ToolbarNames } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

import { languages, languageUserDefined } from './l18n'

import { useGettext } from 'vue3-gettext'
import { useThemeStore } from '../../composables'
import { AppConfigObject } from '../../apps'

import screenfull from 'screenfull'
import Cropper from 'cropperjs'
import { lineNumbers } from '@codemirror/view'

const {
  applicationConfig = undefined,
  currentContent,
  markdownMode = false,
  isReadOnly = false,
  resource = undefined
} = defineProps<{
  applicationConfig?: AppConfigObject
  currentContent: string
  markdownMode?: boolean
  isReadOnly?: boolean
  resource?: Resource
}>()

const emit = defineEmits<{
  (e: 'update:currentContent', value: string): void
}>()

const language = useGettext()
const { currentTheme } = useThemeStore()
const showLineNumbers = ref(true)

const editorConfig = computed(() => {
  const { showPreviewOnlyMd = true } = applicationConfig
  return { showPreviewOnlyMd }
})

const isMarkdown = computed(() => {
  return (
    markdownMode ||
    ['md', 'markdown'].includes(resource?.extension) ||
    !unref(editorConfig).showPreviewOnlyMd
  )
})

const theme = computed(() => (unref(currentTheme).isDark ? 'dark' : 'light'))

const toolbars = computed<ToolbarNames[]>(() => {
  if (!unref(isMarkdown)) {
    return ['revoke', 'next', '=', 0]
  }
  return [
    'bold',
    'underline',
    'italic',
    '-',
    'title',
    'strikeThrough',
    'sub',
    'sup',
    'quote',
    'unorderedList',
    'orderedList',
    'task',
    '-',
    'codeRow',
    'code',
    'link',
    'image',
    'table',
    '-',
    'revoke',
    'next',
    '=',
    0,
    'preview',
    'previewOnly'
  ]
})

config({
  editorConfig: {
    languageUserDefined
  },
  editorExtensions: {
    screenfull: {
      instance: screenfull
    },
    cropper: {
      instance: Cropper
    }
  },
  markdownItPlugins(plugins) {
    return [
      ...plugins,
      {
        type: 'xss',
        plugin: XSSPlugin,
        options: {}
      }
    ]
  },
  codeMirrorExtensions(extensions) {
    const combinedExtensions = [
      ...extensions,
      {
        type: 'lineNumbers',
        extension: lineNumbers()
      }
    ]

    const linkShortener = combinedExtensions.find((extension) => extension.type === 'linkShortener')
    if (linkShortener) {
      linkShortener.options.maxLength = 120
    }

    if (!unref(isMarkdown)) {
      return combinedExtensions.filter((extension) =>
        ['lineWrapping', 'keymap', 'floatingToolbar', 'lineNumbers'].includes(extension.type)
      )
    }

    return combinedExtensions
  }
})

const onUploadImg = async (files: File[]) => {
  const uploadedImages = await Promise.all(
    [...files].map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
    )
  )

  const markdownImages = uploadedImages.map((b64) => `![image](${b64})`)
  const updatedContent = `${currentContent}\n${markdownImages.join('\n\n')}\n`

  emit('update:currentContent', updatedContent)
}
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .md-editor-preview > * {
    @apply break-keep;
  }

  .md-editor-preview > ol {
    @apply !list-[decimal];
  }

  .md-editor-preview > ul {
    @apply !list-[disc];
  }

  .md-editor-code-flag {
    @apply hidden;
  }

  .md-editor-code-head {
    @apply !justify-end;
  }
}
</style>
<style lang="scss">
#text-editor-component {
  .md-editor-preview-wrapper,
  .md-editor-resize-operate {
    // overwrite vendor styling
    background-color: var(--oc-role-surface-container);
  }
}

#text-editor-component.no-line-numbers .cm-gutters {
  display: none !important;
}

#text-editor-preview-component {
  background-color: transparent;
}

#text-editor-component-preview > :first-child,
#text-editor-preview-component-preview > :first-child {
  margin-top: 0 !important;
}

// overwrite md-editor styles
.md-editor {
  height: 100%;
}
</style>
