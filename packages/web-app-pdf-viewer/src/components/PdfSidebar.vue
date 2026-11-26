<template>
  <aside
    class="pdf-viewer-sidebar z-20 flex w-[300px] max-w-[80vw] shrink-0 flex-col border-r border-r-role-border bg-role-surface"
    :class="{ 'absolute inset-y-0 left-0 shadow-lg': isTablet }"
    :aria-label="currentView.label"
  >
    <div class="p-2">
      <oc-button
        id="pdf-viewer-sidebar-views-toggle"
        class="pdf-viewer-sidebar-views p-1"
        appearance="raw"
        gap-size="small"
      >
        <oc-icon :name="currentView.icon" fill-type="line" size-class="size-4" />
        <span class="font-semibold" v-text="currentView.label" />
        <oc-icon name="arrow-down-s" fill-type="line" size-class="size-4" />
      </oc-button>
      <oc-drop
        drop-id="pdf-viewer-sidebar-views"
        toggle="#pdf-viewer-sidebar-views-toggle"
        :title="$gettext('Sidebar view')"
        mode="click"
        padding-size="small"
        class="w-auto min-w-48"
        close-on-click
      >
        <oc-list>
          <pdf-menu-item
            v-for="view in views"
            :key="view.id"
            :class="`pdf-viewer-sidebar-view-${view.id}`"
            :label="view.label"
            :icon="view.icon"
            :is-active="view.id === activeView"
            :disabled="!view.itemCount"
            @click="activeView = view.id"
          />
        </oc-list>
      </oc-drop>
    </div>
    <div
      v-if="activeView === 'outline' && outline"
      class="pdf-viewer-outline flex-1 overflow-y-auto p-2"
    >
      <pdf-outline :items="outline" />
    </div>
    <div v-else-if="activeView === 'attachments' && attachments" class="flex-1 overflow-y-auto p-2">
      <pdf-attachments :attachments="attachments" @open="emit('openAttachment', $event)" />
    </div>
    <div
      v-else-if="activeView === 'layers' && layers"
      class="pdf-viewer-layers flex-1 overflow-y-auto p-2"
    >
      <pdf-layers :items="layers" />
    </div>
    <div
      v-show="activeView === 'pages'"
      v-bind="containerProps"
      class="pdf-viewer-thumbnails flex-1 p-2 [overflow-anchor:none]"
    >
      <ol v-bind="wrapperProps" class="m-0 list-none p-0">
        <pdf-thumbnail
          v-for="{ data: page } in list"
          :key="page"
          :pdf-document="pdfDocument"
          :page-number="page"
          :page-label="pageLabels?.[page - 1]"
          :rotation="rotation"
          :is-current="page === pageNumber"
          :is-read-only="isReadOnly"
          :is-processing="isProcessing"
          :focus-target="page === focusAction?.pageNumber ? focusAction.focusTarget : undefined"
          @focused="focusAction = undefined"
          @select="emit('goToPage', page)"
          @delete="(isKeyboard) => emit('deletePage', page, isKeyboard)"
          @move="(target, isKeyboard) => emit('movePage', page, target, isKeyboard)"
        />
      </ol>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, inject, shallowRef, unref, watch } from 'vue'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import { useGettext } from 'vue3-gettext'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { SidebarView } from '../composables/usePdfInitialView'
import type { PageAction } from '../composables/usePdfPageOperations'
import type { PdfAttachment } from '../composables/usePdfAttachments'
import PdfThumbnail from './PdfThumbnail.vue'
import { pdfOutlineKey } from '../composables/usePdfOutline'
import { pdfLayersKey } from '../composables/usePdfLayers'
import { usePdfThumbnailList } from '../composables/usePdfThumbnailList'
import PdfLayers from './PdfLayers.vue'
import PdfOutline from './PdfOutline.vue'
import PdfAttachments from './PdfAttachments.vue'
import PdfMenuItem from './PdfMenuItem.vue'

const {
  pdfDocument,
  pageNumber,
  pageLabels = undefined,
  rotation = 0,
  isReadOnly = false,
  isProcessing = false,
  lastAction = undefined,
  attachments = undefined
} = defineProps<{
  pdfDocument: PDFDocumentProxy
  pageNumber: number
  /** E.g. "iii" for the third page, see usePdfPageLabels. */
  pageLabels?: string[]
  /** Of all pages, on top of their own. */
  rotation?: number
  isReadOnly?: boolean
  isProcessing?: boolean
  /** The page the last page action was used on, as it is now, and what to focus there. */
  lastAction?: PageAction
  /** Undefined while loading. */
  attachments?: PdfAttachment[]
}>()

const emit = defineEmits<{
  goToPage: [pageNumber: number]
  deletePage: [pageNumber: number, isKeyboard: boolean]
  movePage: [pageNumber: number, targetPageNumber: number, isKeyboard: boolean]
  openAttachment: [attachment: PdfAttachment]
}>()

// Over the pages where there's no room next to them.
const { isTablet } = useIsMobile()
const { $gettext } = useGettext()

// Kept while the sidebar is closed, like in the PDF.js viewer.
const activeView = defineModel<SidebarView>('view', { default: 'pages' })

const { outline } = inject(pdfOutlineKey)
const { layers } = inject(pdfLayersKey)

// The count is undefined while loading, like in the PDF.js viewer the view is disabled then.
const views = computed<{ id: SidebarView; icon: string; label: string; itemCount?: number }[]>(
  () => [
    { id: 'pages', icon: 'pages', label: $gettext('Pages'), itemCount: pdfDocument.numPages },
    {
      id: 'outline',
      icon: 'file-list-3',
      label: $gettext('Document outline'),
      itemCount: unref(outline)?.length
    },
    {
      id: 'attachments',
      icon: 'attachment',
      label: $gettext('Attachments'),
      itemCount: attachments?.length
    },
    { id: 'layers', icon: 'stack', label: $gettext('Layers'), itemCount: unref(layers)?.length }
  ]
)

const currentView = computed(() => unref(views).find(({ id }) => id === unref(activeView)))

// A view that has nothing (any more), e.g. after loading another document, falls back to the
// pages, like in the PDF.js viewer.
watch(
  views,
  () => {
    if (unref(currentView).itemCount === 0) {
      activeView.value = 'pages'
    }
  },
  { immediate: true }
)

// The sidebar is new for every document, while the last action is set. Its thumbnail may mount
// only later, after scrolling to it. Once focused, not again when scrolling back.
const focusAction = shallowRef(lastAction)

const { list, containerProps, wrapperProps } = usePdfThumbnailList({
  pageCount: () => pdfDocument.numPages,
  pageNumber: () => pageNumber,
  isShown: () => unref(activeView) === 'pages'
})
</script>
