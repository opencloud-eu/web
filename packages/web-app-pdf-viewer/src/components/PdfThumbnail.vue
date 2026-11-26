<template>
  <li
    ref="root"
    class="pdf-viewer-thumbnail flex justify-center rounded-lg p-2 transition-colors"
    :class="
      isCurrent
        ? 'bg-role-secondary-container forced-colors:outline-2 forced-colors:-outline-offset-2 forced-colors:outline-[Highlight]'
        : 'hover:bg-role-surface-container'
    "
    :style="{ height: `${THUMBNAIL_HEIGHT}px`, marginBottom: `${THUMBNAIL_GAP}px` }"
    :data-page-number="pageNumber"
  >
    <div class="flex min-w-0 flex-col">
      <div class="flex h-40 items-center justify-center">
        <oc-button
          ref="pageButton"
          class="block overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/10"
          :aria-label="$gettext('Go to page %{page}', { page: label })"
          :aria-current="isCurrent ? 'page' : undefined"
          appearance="raw"
          gap-size="none"
          no-hover
          @click="emit('select')"
        >
          <img v-if="imageUrl" :src="imageUrl" alt="" class="block max-h-40 w-auto max-w-full" />
          <span v-else class="block aspect-[1/1.414] h-40" />
        </oc-button>
      </div>
      <div
        class="mt-1 flex h-6 items-center pl-0.5"
        :class="isReadOnly ? 'justify-center' : 'justify-between'"
      >
        <span
          class="w-0 flex-1 truncate text-xs tabular-nums"
          :class="[
            isCurrent
              ? 'font-semibold text-role-on-secondary-container'
              : 'text-role-on-surface-variant',
            { 'text-center': isReadOnly }
          ]"
          :title="label"
          v-text="label"
        />
        <template v-if="!isReadOnly">
          <oc-button
            :id="`pdf-viewer-page-actions-${pageNumber}`"
            v-oc-tooltip="$gettext('Page actions')"
            :aria-label="$gettext('Actions for page %{page}', { page: label })"
            :disabled="isProcessing"
            class="pdf-viewer-page-actions p-1 disabled:opacity-30"
            appearance="raw-inverse"
            color-role="surface"
            gap-size="none"
          >
            <oc-icon name="more-2" fill-type="line" size-class="size-4" />
          </oc-button>
          <oc-drop
            :drop-id="`pdf-viewer-page-actions-drop-${pageNumber}`"
            :toggle="`#pdf-viewer-page-actions-${pageNumber}`"
            :title="$gettext('Page %{page}', { page: label })"
            mode="click"
            padding-size="small"
            class="w-auto min-w-48"
            close-on-click
          >
            <oc-list>
              <pdf-menu-item
                v-for="action in actions"
                :key="action.id"
                :class="`pdf-viewer-${action.id}`"
                :label="action.label"
                :icon="action.icon"
                :disabled="action.disabled"
                @click="(event: MouseEvent) => action.handler(isKeyboardClick(event))"
              />
            </oc-list>
          </oc-drop>
        </template>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, unref, useTemplateRef } from 'vue'
import { until } from '@vueuse/core'
import { useGettext } from 'vue3-gettext'
import type { OcButton } from '@opencloud-eu/design-system/components'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { usePdfThumbnailImage } from '../composables/usePdfThumbnailImage'
import { THUMBNAIL_GAP, THUMBNAIL_HEIGHT } from '../composables/usePdfThumbnailList'
import { pdfThumbnailCacheKey } from '../composables/usePdfThumbnailCache'
import { pdfEventBusKey } from '../composables/usePdfViewer'
import PdfMenuItem from './PdfMenuItem.vue'

const {
  pdfDocument,
  pageNumber,
  pageLabel = undefined,
  rotation = 0,
  isCurrent = false,
  isReadOnly = false,
  isProcessing = false,
  focusTarget = undefined
} = defineProps<{
  pdfDocument: PDFDocumentProxy
  pageNumber: number
  /** E.g. "iii", see usePdfPageLabels. */
  pageLabel?: string
  /** Of the view, on top of the page's own. */
  rotation?: number
  isCurrent?: boolean
  isReadOnly?: boolean
  isProcessing?: boolean
  /** Focused when shown: the page, or the button of its actions ('page-actions'). */
  focusTarget?: string
}>()

const emit = defineEmits<{
  select: []
  delete: [isKeyboard: boolean]
  move: [targetPageNumber: number, isKeyboard: boolean]
  /** The focus target got the focus. */
  focused: []
}>()

const { $gettext } = useGettext()

// Clicks by Enter or Space have no click count.
function isKeyboardClick(event: MouseEvent) {
  return event.detail === 0
}

const actions = computed(() => [
  {
    id: 'move-page-up',
    icon: 'arrow-up',
    label: $gettext('Move page up'),
    disabled: pageNumber <= 1,
    handler: (isKeyboard: boolean) => emit('move', pageNumber - 1, isKeyboard)
  },
  {
    id: 'move-page-down',
    icon: 'arrow-down',
    label: $gettext('Move page down'),
    disabled: pageNumber >= pdfDocument.numPages,
    handler: (isKeyboard: boolean) => emit('move', pageNumber + 1, isKeyboard)
  },
  {
    id: 'delete-page',
    icon: 'delete-bin',
    label: $gettext('Delete page'),
    disabled: pdfDocument.numPages <= 1,
    handler: (isKeyboard: boolean) => emit('delete', isKeyboard)
  }
])

// Like the thumbnails of the PDF.js viewer.
const label = computed(() => pageLabel ?? String(pageNumber))

const root = useTemplateRef<HTMLLIElement>('root')
const { imageUrl } = usePdfThumbnailImage({
  element: root,
  pdfDocument: () => pdfDocument,
  pageNumber: () => pageNumber,
  rotation: () => rotation,
  cache: inject(pdfThumbnailCacheKey, undefined),
  eventBus: inject(pdfEventBusKey, undefined)
})

const pageButton = useTemplateRef<InstanceType<typeof OcButton>>('pageButton')

// E.g. the same action again for a page that was just moved, unless it doesn't apply anymore.
// The actions are available once the page operation is done.
async function focusTargetElement(target: string) {
  await until(() => isProcessing).toBe(false)
  await nextTick()
  const action = unref(root)?.querySelector<HTMLButtonElement>(`.pdf-viewer-${target}`)
  const element = action && !action.disabled ? action : unref(pageButton)?.$el
  element?.focus({ preventScroll: true })
  emit('focused')
}

onMounted(() => {
  if (focusTarget) {
    focusTargetElement(focusTarget)
  }
})
</script>
