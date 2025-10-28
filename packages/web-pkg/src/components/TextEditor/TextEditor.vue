<template>
  <div
    id="text-editor-container"
    class="h-full [&_.md-editor-preview]:!font-(family-name:--oc-font-family)"
  >
    <md-preview
      v-if="isReadOnly"
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
      :toolbars="[]"
    />
    <md-editor
      v-else
      id="text-editor-component"
      class="[&_.cm-content]:!font-(family-name:--oc-font-family)"
      :model-value="currentContent"
      no-katex
      no-mermaid
      no-prettier
      no-highlight
      :on-upload-img="onUploadImg"
      :language="languages[language.current] || 'en-US'"
      :theme="theme"
      :preview="isMarkdown"
      :toolbars="isMarkdown ? undefined : ['revoke', 'next']"
      :toolbars-exclude="[
        'save',
        'katex',
        'github',
        'catalog',
        'mermaid',
        'prettier',
        'fullscreen',
        'htmlPreview',
        'pageFullscreen'
      ]"
      auto-focus
      @on-change="(value: string) => $emit('update:currentContent', value)"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
import { Resource } from '@opencloud-eu/web-client'

import { config, MdEditor, MdPreview, XSSPlugin } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

import { languages, languageUserDefined } from './l18n'

import { useGettext } from 'vue3-gettext'
import { useThemeStore } from '../../composables'
import { AppConfigObject } from '../../apps'

import screenfull from 'screenfull'

import Cropper from 'cropperjs'
import { lineNumbers } from '@codemirror/view'
import 'cropperjs/dist/cropper.css'

export default defineComponent({
  name: 'TextEditor',
  // type casts are needed to ensure type inference works correctly when building web-pkg
  components: { MdEditor: MdEditor as any, MdPreview: MdPreview as any },
  props: {
    applicationConfig: { type: Object as PropType<AppConfigObject>, required: false },
    currentContent: {
      type: String,
      required: true
    },
    markdownMode: { type: Boolean, required: false, default: false },
    isReadOnly: { type: Boolean, required: false, default: false },
    resource: { type: Object as PropType<Resource>, required: false }
  },
  emits: ['update:currentContent'],
  setup(props, { emit }) {
    const language = useGettext()
    const { currentTheme } = useThemeStore()

    const editorConfig = computed(() => {
      // TODO: Remove typecasting once vue-tsc has figured it out
      const { showPreviewOnlyMd = true } = props.applicationConfig as AppConfigObject
      return { showPreviewOnlyMd }
    })

    const isMarkdown = computed(() => {
      return (
        props.markdownMode ||
        ['md', 'markdown'].includes(props.resource?.extension) ||
        !unref(editorConfig).showPreviewOnlyMd
      )
    })

    const theme = computed(() => (unref(currentTheme).isDark ? 'dark' : 'light'))

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

        const linkShortener = combinedExtensions.find(
          (extension) => extension.type === 'linkShortener'
        )
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
      const updatedContent = `${unref(props.currentContent)}\n${markdownImages.join('\n\n')}\n`

      emit('update:currentContent', updatedContent)
    }

    return {
      isMarkdown,
      theme,
      language,
      languages,
      onUploadImg
    }
  }
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .md-editor-preview > * {
    @apply break-keep;
  }

  .md-editor-preview > ol,
  ul {
    @apply !list-[auto];
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

#text-editor-preview-component {
  background-color: transparent;
}

// overwrite md-editor styles
.md-editor {
  height: 100%;
}
</style>
