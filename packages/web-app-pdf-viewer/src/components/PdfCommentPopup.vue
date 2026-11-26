<template>
  <teleport :to="popup.target.elementBeforePopup.closest('.page')">
    <oc-card
      ref="root"
      class="pdf-viewer-comment-popup pointer-events-auto absolute z-[100001] mt-1 w-72 rounded-xl! border border-role-outline-variant font-sans text-sm shadow-md"
      :style="position"
      header-class="flex-row! items-center! justify-between gap-2 min-h-7 p-3! pb-0!"
      body-class="p-3!"
      role="dialog"
      :aria-label="$gettext('Comment')"
      tabindex="-1"
      @keydown.esc.stop.prevent="emit('close')"
    >
      <template #header>
        <pdf-comment-meta :comment="popup.data" />
        <div v-if="popup.isSelected && popup.isEditable" class="flex gap-0.5">
          <oc-button
            v-oc-tooltip="$gettext('Edit comment')"
            class="pdf-viewer-comment-edit p-1"
            :aria-label="$gettext('Edit comment')"
            appearance="raw"
            @click="emit('edit')"
          >
            <oc-icon name="pencil" fill-type="line" size-class="size-4" />
          </oc-button>
          <oc-button
            v-oc-tooltip="$gettext('Delete comment')"
            class="pdf-viewer-comment-delete p-1"
            :aria-label="$gettext('Delete comment')"
            appearance="raw"
            @click="emit('delete')"
          >
            <oc-icon name="delete-bin" fill-type="line" size-class="size-4" />
          </oc-button>
        </div>
      </template>
      <div
        ref="text"
        class="pdf-viewer-comment-text max-h-60 overflow-y-auto break-words [&_*]:[color:inherit]! [&_*]:[font-size:inherit]! [&_*]:[line-height:inherit]! [&_p]:my-0! [&_.richText>*]:whitespace-pre-wrap"
      />
    </oc-card>
  </teleport>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, unref, useTemplateRef, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import type { OcCard } from '@opencloud-eu/design-system/components'
import { getCommentPopupPosition, renderCommentText } from '../helpers/comments'
import type { CommentPopup } from '../composables/usePdfComments'
import { pdfEventBusKey } from '../composables/usePdfViewer'
import PdfCommentMeta from './PdfCommentMeta.vue'

const { popup } = defineProps<{ popup: CommentPopup }>()

const emit = defineEmits<{ edit: []; delete: []; close: []; dismiss: [] }>()

const root = useTemplateRef<InstanceType<typeof OcCard>>('root')
const text = useTemplateRef<HTMLDivElement>('text')
const eventBus = inject(pdfEventBusKey)

// The width of the popup (w-72).
const POPUP_WIDTH = 288

const position = computed(() =>
  getCommentPopupPosition(
    popup.target,
    POPUP_WIDTH,
    document.getElementById('pdf-viewer-comments')?.getBoundingClientRect(),
    popup.target.elementBeforePopup.closest('.pdf-viewer-viewer-container')?.getBoundingClientRect()
  )
)

// Rich text like in the PDF.js viewer, in the size and color of the popup, not of the page.
watch(
  () => popup.data,
  async () => {
    await nextTick()
    renderCommentText(popup.data, unref(text))
  },
  { immediate: true }
)

// Opened by clicking, not on updates like a changed color.
watch(
  () => [popup.target, popup.isSelected],
  async () => {
    await nextTick()
    if (popup.isSelected) {
      unref(root)?.$el.focus()
    }
  },
  { immediate: true }
)

// Clicking elsewhere closes an opened comment. Its button toggles it by itself, and dialogs
// (e.g. editing it) belong to it.
onClickOutside(
  () => unref(root)?.$el,
  () => {
    if (popup.isSelected) {
      emit('dismiss')
    }
  },
  { ignore: ['.annotationCommentButton', '.oc-modal'] }
)

// PDF.js removes everything but its own layers from a page it resets (e.g. when zooming or
// rotating) and the layers of pages far away from the visible ones, including the comment.
function dismissIfRemoved() {
  if (!unref(root)?.$el.isConnected || !popup.target.elementBeforePopup.isConnected) {
    emit('dismiss')
  }
}
eventBus?.on('updateviewarea', dismissIfRemoved)
onBeforeUnmount(() => eventBus?.off('updateviewarea', dismissIfRemoved))
</script>
