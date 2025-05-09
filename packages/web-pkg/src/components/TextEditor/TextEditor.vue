<template>
  <div id="text-editor-container" class="oc-height-1-1">
    <md-preview
      v-if="isReadOnly"
      id="text-editor-preview-component"
      :model-value="currentContent"
      no-katex
      no-mermaid
      no-prettier
      no-upload-img
      no-highlight
      :language="languages[language.current] || 'en-US'"
      :theme="theme"
      auto-focus
      read-only
      :toolbars="[]"
    />
    <md-editor
      v-else
      id="text-editor-component"
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
      :read-only="isReadOnly"
      auto-focus
      @on-change="(value) => $emit('update:currentContent', value)"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, unref, PropType } from 'vue'
import { Resource } from '@opencloud-eu/web-client'

import { config, MdEditor, MdPreview, XSSPlugin } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

import { languageUserDefined, languages } from './l18n'

import { useGettext } from 'vue3-gettext'
import { useThemeStore } from '../../composables'
import { AppConfigObject } from '../../apps'

import screenfull from 'screenfull'

import Cropper from 'cropperjs'
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
<style lang="scss">
#text-editor-component {
  .md-editor-preview-wrapper,
  .md-editor-resize-operate {
    background-color: var(--oc-role-surface-container);
  }
}

.md-editor {
  height: 100%;

  &-code-head {
    justify-content: end !important;
  }

  &-code-flag {
    display: none;
  }

  .cm-line:has(.ͼy),
  .cm-line:has(.ͼ1h) {
    max-height: 60px;
    overflow: auto;
    margin-right: var(--oc-space-medium);
  }
}
</style>
