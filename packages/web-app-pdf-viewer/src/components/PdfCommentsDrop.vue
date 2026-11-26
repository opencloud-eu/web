<template>
  <oc-drop
    ref="drop"
    drop-id="pdf-viewer-comments"
    toggle="#pdf-viewer-comments-toggle"
    mode="manual"
    padding-size="remove"
    :title="title"
    class="pdf-viewer-comments w-80"
    @show-drop="isShown = true"
    @hide-drop="onHide"
  >
    <div v-if="!isMobile" class="flex items-center gap-2 px-4 pt-3 pb-2">
      <h2 class="m-0 text-base font-semibold" v-text="$gettext('Comments')" />
      <oc-tag
        class="pdf-viewer-comments-count tabular-nums"
        size="xsmall"
        rounded
        appearance="filled"
      >
        {{ comments?.length ?? 0 }}
      </oc-tag>
    </div>
    <p
      v-if="!comments?.length"
      class="m-0 px-4 pb-4 text-sm text-role-on-surface-variant"
      :class="{ 'pt-3': isMobile }"
      v-text="$gettext('Select an annotation and add a comment in its toolbar.')"
    />
    <oc-list
      v-else
      ref="list"
      raw
      class="flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-3 pb-3"
      :class="{ 'pt-3': isMobile }"
    >
      <li v-for="comment in comments" :key="comment.id">
        <oc-button
          class="pdf-viewer-comment-item w-full flex-col! items-start! rounded-xl p-3 text-left"
          :class="{
            'bg-role-surface-container hover:bg-role-surface-container-high':
              comment.id !== selectedId
          }"
          :aria-current="comment.id === selectedId || undefined"
          :appearance="comment.id === selectedId ? 'filled' : 'raw-inverse'"
          :color-role="comment.id === selectedId ? 'secondaryContainer' : 'surface'"
          gap-size="small"
          no-hover
          @click="openComment(comment)"
        >
          <pdf-comment-meta :comment="comment" />
          <span
            class="line-clamp-4 whitespace-pre-line text-sm"
            dir="auto"
            :title="getCommentText(comment)"
            v-text="getCommentText(comment)"
          />
        </oc-button>
      </li>
    </oc-list>
  </oc-drop>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, unref, useTemplateRef, watch } from 'vue'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import type { OcList } from '@opencloud-eu/design-system/components'
import { useGettext } from 'vue3-gettext'
import { useEventListener } from '@vueuse/core'
import { getCommentText, type CommentData } from '../helpers/comments'
import PdfCommentMeta from './PdfCommentMeta.vue'

const { comments = undefined, selectedId = undefined } = defineProps<{
  /** Provided by PDF.js while its comments tool is active. */
  comments?: CommentData[]
  selectedId?: string
}>()

const emit = defineEmits<{
  open: [comment: CommentData]
  close: []
}>()

// The drawer on phones has its own title, the count goes in there.
const { isMobile } = useIsMobile()
const { $gettext } = useGettext()
const title = computed(() =>
  unref(isMobile) && comments
    ? $gettext('Comments (%{count})', { count: String(comments.length) })
    : $gettext('Comments')
)

const isShown = ref(false)
const drop = useTemplateRef<{ show(options?: { noFocus?: boolean }): void; hide(): void }>('drop')
const list = useTemplateRef<InstanceType<typeof OcList>>('list')

// Working with the comments on the page keeps the list, like the sidebar of the PDF.js viewer:
// their popups, their buttons (or the annotations that are their own, e.g. sticky notes) and
// the dialog to edit them.
const COMMENT_ELEMENTS =
  '.pdf-viewer-comment-popup, .annotationCommentButton, .popupTriggerArea, .oc-modal'
let isClickOnComment = false
useEventListener(
  document,
  'click',
  (event: MouseEvent) => {
    isClickOnComment = !!(event.target as Element).closest?.(COMMENT_ELEMENTS)
  },
  { capture: true }
)

// On small screens the list is a bottom drawer covering the page, it makes room for the
// comment, the comments tool stays active.
let isMakingRoom = false
function openComment(comment: CommentData) {
  emit('open', comment)
  if (unref(isMobile)) {
    isMakingRoom = true
    unref(drop)?.hide()
  }
}

// Closed by the user, e.g. clicking elsewhere. Without comments, PDF.js closed it already.
function onHide() {
  isShown.value = false
  if (!comments || isMakingRoom) {
    isMakingRoom = false
    return
  }
  if (isClickOnComment) {
    isClickOnComment = false
    unref(drop)?.show({ noFocus: true })
    return
  }
  emit('close')
}

watch(
  () => !!comments,
  (hasComments) => (hasComments ? unref(drop)?.show() : unref(drop)?.hide())
)

// Comments selected on the page get scrolled into view, like in the PDF.js viewer.
watch(
  () => selectedId,
  async () => {
    await nextTick()
    unref(list)?.$el.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' })
  }
)

/** Shows the list again, e.g. after it made room for a comment on a small screen. */
function show() {
  unref(drop)?.show()
}

defineExpose({ isShown, show })
</script>
