<template>
  <div
    v-if="textEditor.editor.value"
    ref="contentRef"
    class="text-editor-content h-full"
    :style="{
      '--text-editor-zoom-factor': zoomFactor
    }"
    @mousemove="scrolledAway = false"
  >
    <DragHandle
      v-show="!isSourceMode"
      :editor="textEditor.editor.value"
      @node-change="onDragHandleNodeChange"
    >
      <div
        v-show="isDraggable"
        ref="controlsRef"
        class="drag-handle-controls flex items-center gap-1 mr-1 mt-[0.125rem]"
      >
        <oc-button
          v-if="hasSlashCommands"
          appearance="raw"
          class="drag-handle-plus-button"
          :aria-label="$gettext('Add content')"
          @click="openSlashMenu"
        >
          <oc-icon name="add" />
        </oc-button>
        <oc-button
          v-if="!isMobile"
          appearance="raw"
          class="custom-drag-handle cursor-grab!"
          :aria-label="$gettext('Drag to move')"
        >
          <oc-icon name="draggable" fill-type="none" />
        </oc-button>
      </div>
    </DragHandle>
    <TextEditorTableBubbleMenu v-show="!isSourceMode" />
    <TextEditorLinkBubbleMenu v-show="!isSourceMode" />
    <EditorContent v-show="!isSourceMode" :editor="textEditor.editor.value" class="h-full" />
    <TextEditorSourceView v-if="isSourceMode" :editor="textEditor" />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, unref, useTemplateRef, watch } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import { DragHandle } from '@tiptap/extension-drag-handle-vue-3'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import TextEditorTableBubbleMenu from './TextEditorTableBubbleMenu.vue'
import TextEditorLinkBubbleMenu from './TextEditorLinkBubbleMenu.vue'
import TextEditorSourceView from './TextEditorSourceView.vue'
import type { TextEditorInstance } from '../types'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import { useThemeStore } from '../../composables'
import atomOneDarkThemeUrl from 'highlight.js/styles/atom-one-dark.css?url'
import atomOneLightThemeUrl from 'highlight.js/styles/atom-one-light.css?url'

const { editor = undefined } = defineProps<{
  editor?: TextEditorInstance
}>()

const { $gettext } = useGettext()
const { isMobile } = useIsMobile()
const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)

const textEditor = editor || inject<TextEditorInstance>('textEditor')!
const currentDragHandleNodePos = ref<number | null>(null)
const isFrontmatterNode = ref(false)
const scrolledAway = ref(false)
const contentRef = useTemplateRef<HTMLElement>('contentRef')
const controlsRef = useTemplateRef<HTMLElement>('controlsRef')
const isDarkTheme = computed(() => unref(currentTheme)?.isDark)
const hljsThemeStyleElement = ref<HTMLLinkElement | null>(null)

const isSourceMode = computed(() => unref(textEditor.state.sourceMode))

const isDraggable = computed(() => {
  // Frontmatter is pinned to the top of the document and cannot be moved, so
  // neither hover handle has anything to offer there.
  if (unref(isFrontmatterNode)) {
    return false
  }

  return !unref(scrolledAway)
})
const zoomFactor = computed(() => {
  return `${(unref(textEditor.state.editorZoom) || 100) / 100}`
})

const hasSlashCommands = computed(() => {
  const editor = unref(textEditor.editor)
  if (!editor) {
    return false
  }
  return editor.extensionManager.extensions.some((ext) => ext.name === 'slashCommands')
})

const onDragHandleNodeChange = ({ node, pos }: { node: ProseMirrorNode | null; pos: number }) => {
  currentDragHandleNodePos.value = pos
  isFrontmatterNode.value = node?.type.name === 'frontmatter'
}

const openSlashMenu = () => {
  if (!textEditor.editor.value) {
    return
  }

  // Use the position from the drag handle's current node
  if (currentDragHandleNodePos.value !== null) {
    const pos = currentDragHandleNodePos.value
    const node = textEditor.editor.value.state.doc.nodeAt(pos)

    if (node) {
      // Check if node has content
      const hasContent = node.content.size > 0

      if (hasContent) {
        // Insert new line after the node
        const afterPos = pos + node.nodeSize
        textEditor.editor.value
          .chain()
          .focus()
          .insertContentAt(afterPos, { type: 'paragraph' })
          .setTextSelection(afterPos + 1)
          .insertContent('/')
          .run()
      } else {
        // Node is empty, insert at the beginning
        textEditor.editor.value
          .chain()
          .focus()
          .setTextSelection(pos + 1)
          .insertContent('/')
          .run()
      }
    }
  } else {
    // Fallback: insert at current position
    textEditor.editor.value.commands.insertContent('/')
  }
}

function applyHljsThemeCss() {
  if (!hljsThemeStyleElement.value) {
    return
  }

  hljsThemeStyleElement.value.href = unref(isDarkTheme) ? atomOneDarkThemeUrl : atomOneLightThemeUrl
}

watch(isDarkTheme, applyHljsThemeCss)

/**
 * The handle keeps the position it was given for the hovered node and never
 * follows a scroll. Scrolling the editor itself is harmless - the handle stays
 * over the text and the next pointer move corrects it - but a scroll further up
 * moves the editor out from under it, leaving it floating over whatever sits
 * around the editor. Only that case hides it.
 */
function onAnyScroll() {
  if (unref(scrolledAway)) {
    return
  }

  const content = unref(contentRef)
  const controls = unref(controlsRef)
  if (!content || !controls) {
    return
  }

  const bounds = content.getBoundingClientRect()
  const handle = controls.getBoundingClientRect()
  scrolledAway.value = handle.bottom < bounds.top || handle.top > bounds.bottom
}

onMounted(() => {
  if (typeof document === 'undefined') {
    return
  }

  document.addEventListener('scroll', onAnyScroll, true)

  const styleElement = document.createElement('link')
  styleElement.rel = 'stylesheet'
  styleElement.setAttribute('data-oc-text-editor-hljs-theme', 'true')
  document.head.appendChild(styleElement)
  hljsThemeStyleElement.value = styleElement
  applyHljsThemeCss()
})

onUnmounted(() => {
  document.removeEventListener('scroll', onAnyScroll, true)
  hljsThemeStyleElement.value?.remove()
  hljsThemeStyleElement.value = null
})
</script>

<style>
@import '../styles/content.css';
</style>
