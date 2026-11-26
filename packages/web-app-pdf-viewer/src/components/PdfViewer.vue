<template>
  <div ref="root" class="pdf-viewer flex size-full flex-col">
    <pdf-toolbar
      v-if="pdfDocument"
      ref="toolbar"
      :page-number="pageNumber"
      :pages-count="pagesCount"
      :page-labels="pageLabels"
      :scale-value="scaleValue"
      :scale="scale"
      :scroll-mode="scrollMode"
      :spread-mode="spreadMode"
      :editor-mode="editorMode"
      :editing-states="undoStates"
      :editor-params="editorParams"
      :saved-signatures="savedSignatures"
      :can-annotate="canAnnotate"
      :are-tools-disabled="!uiManager"
      :is-sidebar-open="isSidebarOpen"
      :is-find-bar-open="isFindBarOpen"
      :is-printing="isPrinting"
      :can-present="canPresent"
      :is-hand-tool-active="isHandToolActive"
      :is-tool-active="isToolActive"
      @toggle-sidebar="toggleSidebar"
      @toggle-find-bar="toggleFindBar"
      @go-to-page="goToPage"
      @previous-page="previousPage"
      @next-page="nextPage"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @set-scale="setScale"
      @rotate="rotate"
      @print="print"
      @present="present"
      @show-properties="showProperties"
      @set-hand-tool="setHandTool"
      @undo="undoChange"
      @redo="redoChange"
      @select-tool="chooseTool"
      @add-image="addImage"
      @add-saved-signature="addSavedSignature"
      @remove-saved-signature="removeSavedSignature"
      @update-param="updateEditorSetting"
      @open-tool-settings="finishDrawings"
      @set-scroll-mode="setScrollMode"
      @set-spread-mode="setSpreadMode"
    />
    <div class="relative flex min-h-0 flex-1">
      <pdf-sidebar
        v-if="isSidebarOpen && pdfDocument"
        :key="documentKey"
        v-model:view="sidebarView"
        :pdf-document="pdfDocument"
        :page-number="pageNumber"
        :page-labels="pageLabels"
        :rotation="rotation"
        :is-read-only="!canAnnotate"
        :is-processing="isProcessingPages"
        :last-action="lastPageAction"
        :attachments="attachments"
        @go-to-page="goToPage"
        @open-attachment="openAttachment"
        @delete-page="deletePage"
        @move-page="movePage"
      />
      <div ref="viewerArea" class="relative min-w-0 flex-1 bg-role-surface-container">
        <div
          ref="viewerContainer"
          tabindex="-1"
          :inert="isProcessingPages"
          class="pdf-viewer-viewer-container absolute inset-0 overflow-auto overscroll-contain isolate"
          :class="[presentationClasses, handToolClasses]"
        >
          <div class="pdfViewer text-black" />
          <div ref="viewerAlert" class="sr-only" role="alert" aria-live="assertive" />
        </div>
        <pdf-find-bar
          v-if="isFindBarOpen"
          ref="findBar"
          v-model:query="findQuery"
          v-model:options="findOptions"
          class="absolute top-1 z-30"
          :style="{ left: `${findBarLeft}px`, maxWidth: `calc(100% - ${findBarLeft}px - 1rem)` }"
          :find-result="findResult"
          @find="find"
          @close="closeFindBar"
        />
        <pdf-load-status :is-loading="isLoading" :has-error="!!loadError" />
      </div>
      <pdf-comments-drop
        v-if="pdfDocument"
        ref="commentsDrop"
        :comments="comments"
        :selected-id="selectedCommentId"
        @open="openComment"
        @close="leaveTool"
      />
      <pdf-comment-popup
        v-if="commentPopup"
        :popup="commentPopup"
        @edit="editPopupComment"
        @delete="deletePopupComment"
        @close="closeCommentPopup"
        @dismiss="hideCommentPopup"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, toRef, unref, useTemplateRef } from 'vue'
import { until, useElementBounding, useStyleTag } from '@vueuse/core'
import type { Resource } from '@opencloud-eu/web-client'
import { useAppNavigation, useRouter, type FileContext } from '@opencloud-eu/web-pkg'
import pdfViewerCss from 'pdfjs-dist/web/pdf_viewer.css?inline'
import pdfjsIntegrationCss from '../styles/pdfjs-integration.css?inline'
import '../styles/print.css'
import { pdfEventBusKey, usePdfViewer } from '../composables/usePdfViewer'
import { usePdfDocument } from '../composables/usePdfDocument'
import { usePdfChangeTracking } from '../composables/usePdfChangeTracking'
import { usePdfPageOperations } from '../composables/usePdfPageOperations'
import { usePdfPrint } from '../composables/usePdfPrint'
import { usePdfDownload } from '../composables/usePdfDownload'
import { usePdfAnnotations } from '../composables/usePdfAnnotations'
import { usePdfEditorUndoBar } from '../composables/usePdfEditorUndoBar'
import { usePdfInitialView } from '../composables/usePdfInitialView'
import { usePdfShortcuts } from '../composables/usePdfShortcuts'
import { usePdfZoomGestures } from '../composables/usePdfZoomGestures'
import { usePdfFindBar } from '../composables/usePdfFindBar'
import { usePdfPresentationMode } from '../composables/usePdfPresentationMode'
import { usePdfHandTool } from '../composables/usePdfHandTool'
import { usePdfDocumentProperties } from '../composables/usePdfDocumentProperties'
import { pdfOutlineKey, usePdfOutline } from '../composables/usePdfOutline'
import { pdfLayersKey, usePdfLayers } from '../composables/usePdfLayers'
import { usePdfPageLabels } from '../composables/usePdfPageLabels'
import { pdfThumbnailCacheKey, usePdfThumbnailCache } from '../composables/usePdfThumbnailCache'
import { usePdfAttachments } from '../composables/usePdfAttachments'
import PdfToolbar from './PdfToolbar.vue'
import PdfFindBar from './PdfFindBar.vue'
import PdfSidebar from './PdfSidebar.vue'
import PdfLoadStatus from './PdfLoadStatus.vue'
import PdfCommentsDrop from './PdfCommentsDrop.vue'
import PdfCommentPopup from './PdfCommentPopup.vue'

const { resource, currentContent, isReadOnly, isDirty, currentFileContext } = defineProps<{
  resource: Resource
  currentContent: ArrayBuffer
  isReadOnly: boolean
  isDirty: boolean
  currentFileContext: FileContext
}>()

const emit = defineEmits<{
  'update:currentContent': [content: ArrayBuffer]
  /** AppWrapper calls it after each of its saves. */
  'register:onSaveCallback': [callback: () => Promise<void>]
  /** AppWrapper calls it before each of its saves and before it decides about unsaved changes. */
  'register:onFlushContentCallback': [callback: () => Promise<void>]
}>()

// The build bundles all imported CSS into the one stylesheet of the app start, so the big
// stylesheet of PDF.js and our fixes for it (which have to come after it) are only added while a
// PDF is open.
useStyleTag(`${pdfViewerCss}\n${pdfjsIntegrationCss}`, { id: 'pdf-viewer-pdfjs-styles' })

const root = useTemplateRef<HTMLDivElement>('root')
const viewerContainer = useTemplateRef<HTMLDivElement>('viewerContainer')
const toolbar = useTemplateRef<InstanceType<typeof PdfToolbar>>('toolbar')
const findBar = useTemplateRef<InstanceType<typeof PdfFindBar>>('findBar')
// OcDrop looks its toggle up once when mounted, so the comments drop mounts together with the
// toolbar the toggle is in (both depend on the document).
const commentsDrop = useTemplateRef<InstanceType<typeof PdfCommentsDrop>>('commentsDrop')

// The managers are needed by the viewer, which comes first.
const {
  altTextManager,
  signatureManager,
  commentManager,
  savedSignatures,
  removeSavedSignature,
  comments,
  selectedCommentId,
  popup: commentPopup,
  openComment,
  closePopup: closeCommentPopup,
  hidePopup: hideCommentPopup,
  editPopupComment,
  deletePopupComment,
  addImage,
  addSavedSignature,
  chooseTool
} = usePdfAnnotations({
  resource: () => resource,
  isReadOnly: () => isReadOnly,
  commentsDrop,
  getViewer: () => pdfViewer,
  onChange: () => scheduleChangeCheck()
})

const { editorUndoBar } = usePdfEditorUndoBar({ onChange: () => scheduleChangeCheck() })

const pdfViewer = usePdfViewer({
  container: viewerContainer,
  viewerAlert: useTemplateRef<HTMLDivElement>('viewerAlert'),
  isReadOnly: () => isReadOnly,
  altTextManager,
  signatureManager,
  commentManager,
  editorUndoBar
})
const {
  editing,
  viewer,
  eventBus,
  linkService,
  downloadManager,
  pagesCount,
  pageNumber,
  scaleValue,
  scale,
  rotation,
  setDocument,
  goToPage,
  nextPage,
  previousPage,
  setScale,
  zoomIn,
  zoomOut,
  zoomAt,
  panBy,
  scrollMode,
  spreadMode,
  setScrollMode,
  setSpreadMode,
  rotate
} = pdfViewer
const {
  uiManager,
  editorMode,
  isToolActive,
  editingStates,
  editorParams,
  leaveTool,
  handleEscape,
  finishDrawings,
  commitEditing,
  updateEditorSetting,
  undo,
  redo
} = editing

const { isSidebarOpen, sidebarView, toggleSidebar, applyInitialView } = usePdfInitialView({
  setSpreadMode
})

// Back to where the file was opened from, like AppWrapper's close button.
const { closeApp } = useAppNavigation({
  router: useRouter(),
  currentFileContext: toRef(() => currentFileContext)
})

const { pdfDocument, documentKey, isLoading, loadError, load } = usePdfDocument({
  onLoaded(doc, options) {
    resetChangeTracking()
    setDocument(doc, options)
    applyInitialView(doc)
  },
  // Without the password there is nothing to show. A document rebuilt from the unlocked one
  // (e.g. after deleting a page) is encrypted the same way, so PDF.js has no reason to ask again;
  // if it does, the unlocked one stays.
  onPasswordCancelled: () => {
    if (!unref(pdfDocument)) {
      closeApp()
    }
  }
})

const { attachments, openAttachment } = usePdfAttachments({
  eventBus,
  pdfDocument,
  linkService,
  downloadManager
})

provide(pdfEventBusKey, eventBus)
provide(pdfLayersKey, usePdfLayers({ viewer, eventBus }))
const { pageLabels } = usePdfPageLabels({ viewer, eventBus })

const thumbnailCache = usePdfThumbnailCache()
provide(pdfThumbnailCacheKey, thumbnailCache)

// Lives as long as the document, the sidebar keeps its state while it is closed.
provide(pdfOutlineKey, usePdfOutline({ pdfDocument, pageNumber, linkService, openAttachment }))

// PDF.js can't edit XFA forms (only fill them in) and writes nothing for read-only files.
const canAnnotate = computed(() => !isReadOnly && !unref(pdfDocument)?.isPureXfa)

const {
  scheduleCheck: scheduleChangeCheck,
  flush,
  reset: resetChangeTracking,
  flushContent,
  afterSave
} = usePdfChangeTracking({
  pdfDocument,
  root,
  isEnabled: () => !unref(isProcessingPages),
  isReadOnly: () => isReadOnly,
  isDirty: () => isDirty,
  content: () => currentContent,
  editing,
  onChange: (content) => emit('update:currentContent', content)
})
emit('register:onFlushContentCallback', flushContent)
emit('register:onSaveCallback', afterSave)

const {
  isProcessing: isProcessingPages,
  lastAction: lastPageAction,
  deletePage,
  movePage,
  undoStates,
  undo: undoChange,
  redo: redoChange
} = usePdfPageOperations({
  pdfDocument,
  edits: { states: editingStates, undo, redo },
  getContent: () => currentContent,
  getPageNumber: () => unref(pageNumber),
  // A drawing becomes part of the document once finished, which clicking a page action doesn't
  // do in every browser (Safari).
  beforeChange: () => {
    finishDrawings()
    return flush()
  },
  async onDocumentChanged(content, nextPageNumber, previousPageNumbers) {
    thumbnailCache.remap(previousPageNumbers)
    emit('update:currentContent', content)
    await load(content, { pageNumber: nextPageNumber })
  }
})

const {
  isFindBarOpen,
  findQuery,
  findOptions,
  findResult,
  find,
  findAgain,
  openFindBar,
  closeFindBar,
  toggleFindBar
} = usePdfFindBar({
  eventBus,
  findBar,
  // Escape goes back to the pages like in the PDF.js viewer, the button to its toggle.
  onClose: (isEscape) => {
    if (isEscape) {
      unref(viewerContainer)?.focus({ preventScroll: true })
      return
    }
    unref(toolbar)?.focusFindToggle()
  }
})

// Below the find button, like in the PDF.js viewer, but within the pages.
const { left: findToggleLeft } = useElementBounding(() => unref(toolbar)?.findToggleElement)
const { left: viewerAreaLeft } = useElementBounding(useTemplateRef<HTMLElement>('viewerArea'))
const findBarLeft = computed(() => Math.max(16, unref(findToggleLeft) - unref(viewerAreaLeft)))

const {
  isSupported: canPresent,
  isActive: isPresenting,
  containerClasses: presentationClasses,
  request: present
} = usePdfPresentationMode({ container: viewerContainer, viewer, eventBus })

const {
  isActive: isHandToolActive,
  containerClasses: handToolClasses,
  setChosen: setHandTool
} = usePdfHandTool({ container: viewerContainer, isToolActive, isPresenting, leaveTool })

const { showProperties } = usePdfDocumentProperties({
  pdfDocument,
  resource: () => resource,
  pageNumber,
  rotation
})

// Includes text being typed and drawings, like saving.
const { isPrinting, print } = usePdfPrint({
  pdfDocument,
  eventBus,
  beforePrint: commitEditing
})

usePdfDownload({
  pdfDocument,
  eventBus,
  downloadManager,
  fileName: () => resource.name,
  beforeDownload: commitEditing
})

function selectPageNumber() {
  unref(toolbar)?.selectPageNumber()
}

// "Go to page" buttons of forms, like Ctrl+Alt+G and in the PDF.js viewer.
eventBus.on('namedaction', ({ action }: { action: string }) => {
  if (action === 'GoToPage') {
    selectPageNumber()
  }
})

usePdfShortcuts({
  root,
  container: viewerContainer,
  isReadOnly: () => isReadOnly,
  isPresenting,
  isToolActive,
  editingStates,
  isPageFit: () => unref(scaleValue) === 'page-fit',
  isFindBarOpen,
  actions: {
    print,
    present,
    setHandTool,
    toggleSidebar,
    openFindBar,
    closeFindBar,
    selectPageNumber,
    findAgain,
    zoomIn,
    zoomOut,
    resetZoom: () => setScale('auto'),
    undo: undoChange,
    redo: redoChange,
    nextPage,
    previousPage,
    firstPage: () => goToPage(1),
    lastPage: () => goToPage(unref(pagesCount)),
    rotate,
    handleEscape
  }
})

usePdfZoomGestures({
  root,
  container: viewerContainer,
  isPresenting,
  scale,
  zoomAt,
  panBy
})

onMounted(async () => {
  // The app can be opened before AppWrapper has fetched the content.
  load(await until(() => currentContent).toBeTruthy())
})
</script>
