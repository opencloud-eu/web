<template>
  <div class="pdf-viewer-toolbar flex items-center border-b border-b-role-border">
    <div
      ref="items"
      class="pdf-viewer-toolbar-items flex min-w-0 grow flex-wrap items-center justify-center gap-x-1 gap-y-0.5 py-1 *:shrink-0"
    >
      <div class="inline-flex items-center gap-1">
        <pdf-toolbar-button
          :label="$gettext('Toggle sidebar')"
          icon="side-bar"
          :fill-type="isSidebarOpen ? 'fill' : 'line'"
          :is-active="isSidebarOpen"
          class="pdf-viewer-toggle-sidebar"
          @click="emit('toggleSidebar')"
        />
        <pdf-toolbar-button
          ref="findToggle"
          :label="$gettext('Find in document')"
          icon="seo"
          :is-active="isFindBarOpen"
          class="pdf-viewer-toggle-find"
          @click="emit('toggleFindBar')"
        />
      </div>

      <div :class="groupClass">
        <pdf-toolbar-button
          v-if="!isTablet"
          :label="$gettext('Previous page')"
          icon="arrow-up-s"
          :disabled="pageNumber <= 1"
          class="pdf-viewer-previous-page"
          @click="emit('previousPage')"
        />
        <pdf-page-number
          ref="pageNumberInput"
          :page-number="pageNumber"
          :pages-count="pagesCount"
          :page-labels="pageLabels"
          @go-to-page="emit('goToPage', $event)"
        />
        <pdf-toolbar-button
          v-if="!isTablet"
          :label="$gettext('Next page')"
          icon="arrow-down-s"
          :disabled="pageNumber >= pagesCount"
          class="pdf-viewer-next-page"
          @click="emit('nextPage')"
        />
      </div>

      <div v-if="!inMenu.zoom" :class="groupClass">
        <pdf-toolbar-button
          :label="$gettext('Zoom out')"
          icon="subtract"
          :disabled="!canZoomOut"
          class="pdf-viewer-zoom-out"
          @click="emit('zoomOut')"
        />
        <pdf-zoom-menu
          :scale-value="scaleValue"
          :scale="scale"
          @set-scale="emit('setScale', $event)"
        />
        <pdf-toolbar-button
          :label="$gettext('Zoom in')"
          icon="add"
          :disabled="!canZoomIn"
          class="pdf-viewer-zoom-in"
          @click="emit('zoomIn')"
        />
      </div>

      <div v-if="canAnnotate && !inMenu.undo" :class="groupClass">
        <pdf-toolbar-button
          :label="$gettext('Undo')"
          icon="arrow-go-back"
          :disabled="!editingStates.hasSomethingToUndo"
          class="pdf-viewer-undo"
          @click="emit('undo')"
        />
        <pdf-toolbar-button
          :label="$gettext('Redo')"
          icon="arrow-go-forward"
          :disabled="!editingStates.hasSomethingToRedo"
          class="pdf-viewer-redo"
          @click="emit('redo')"
        />
      </div>

      <div v-if="canAnnotate" :class="groupClass">
        <pdf-tool-picker v-if="isMobile" v-bind="toolsProps" v-on="toolsEvents" />
        <pdf-annotation-tools v-else v-bind="toolsProps" v-on="toolsEvents" />
      </div>

      <div :class="groupClass">
        <pdf-toolbar-button
          v-if="!inMenu.print"
          :label="$gettext('Print')"
          icon="printer"
          :disabled="isPrinting"
          :show-spinner="isPrinting"
          class="pdf-viewer-print"
          @click="emit('print')"
        />
        <pdf-more-menu
          :in-menu="inMenu"
          :scroll-mode="scrollMode"
          :spread-mode="spreadMode"
          :can-annotate="canAnnotate"
          :can-undo="editingStates.hasSomethingToUndo"
          :can-redo="editingStates.hasSomethingToRedo"
          :can-present="canPresent"
          :is-printing="isPrinting"
          :is-hand-tool-active="isHandToolActive"
          :is-tool-active="isToolActive"
          :can-zoom-in="canZoomIn"
          :can-zoom-out="canZoomOut"
          :is-first-page="pageNumber <= 1"
          :is-last-page="pageNumber >= pagesCount"
          @undo="emit('undo')"
          @redo="emit('redo')"
          @zoom-in="emit('zoomIn')"
          @zoom-out="emit('zoomOut')"
          @print="emit('print')"
          @present="emit('present')"
          @first-page="emit('goToPage', 1)"
          @last-page="emit('goToPage', pagesCount)"
          @rotate="emit('rotate', $event)"
          @set-hand-tool="emit('setHandTool', $event)"
          @set-scroll-mode="emit('setScrollMode', $event)"
          @set-spread-mode="emit('setSpreadMode', $event)"
          @show-properties="emit('showProperties')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUpdated, unref, useTemplateRef } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { useGettext } from 'vue3-gettext'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import type { ScaleValue } from '../composables/usePdfViewer'
import { MAX_SCALE, MIN_SCALE } from '../helpers/pdfjs'
import type { EditingStates } from '../composables/usePdfEditing'
import PdfToolbarButton from './PdfToolbarButton.vue'
import PdfZoomMenu from './PdfZoomMenu.vue'
import PdfAnnotationTools from './PdfAnnotationTools.vue'
import PdfMoreMenu from './PdfMoreMenu.vue'
import PdfPageNumber from './PdfPageNumber.vue'
import PdfToolPicker from './PdfToolPicker.vue'
import type { SavedSignature } from '../composables/usePdfSignatureStorage'

const {
  pageNumber,
  pagesCount,
  pageLabels = undefined,
  scaleValue,
  scale,
  scrollMode,
  spreadMode,
  editorMode,
  editingStates,
  editorParams = new Map(),
  savedSignatures = [],
  canAnnotate = false,
  areToolsDisabled = false,
  isSidebarOpen = false,
  isFindBarOpen = false,
  isPrinting = false,
  canPresent = false,
  isHandToolActive = false,
  isToolActive = false
} = defineProps<{
  pageNumber: number
  pagesCount: number
  /** E.g. "iii" for the third page, see usePdfPageLabels. */
  pageLabels?: string[]
  scaleValue: ScaleValue
  /** The current zoom, e.g. 1.25 for 125%. */
  scale: number
  scrollMode: number
  spreadMode: number
  editorMode: number
  editingStates: EditingStates
  /** Settings of the annotation tools, see PdfAnnotationTools. */
  editorParams?: Map<number, unknown>
  savedSignatures?: SavedSignature[]
  /** False for read-only files and XFA forms, which PDF.js can't annotate. */
  canAnnotate?: boolean
  areToolsDisabled?: boolean
  isSidebarOpen?: boolean
  isFindBarOpen?: boolean
  isPrinting?: boolean
  /** The browser allows full screen, see usePdfPresentationMode. */
  canPresent?: boolean
  isHandToolActive?: boolean
  /** An annotation tool is active, text selection and hand tool are paused then. */
  isToolActive?: boolean
}>()

const emit = defineEmits<{
  toggleSidebar: []
  toggleFindBar: []
  goToPage: [pageNumber: number]
  previousPage: []
  nextPage: []
  zoomIn: []
  zoomOut: []
  setScale: [value: ScaleValue]
  rotate: [delta: 90 | -90]
  print: []
  present: []
  showProperties: []
  setHandTool: [isChosen: boolean]
  undo: []
  redo: []
  selectTool: [mode: number]
  addImage: [source: 'device' | 'cloud']
  addSavedSignature: [signature: SavedSignature]
  removeSavedSignature: [uuid: string]
  updateParam: [mode: number, type: number, value: unknown]
  openToolSettings: []
  setScrollMode: [mode: number]
  setSpreadMode: [mode: number]
}>()

const { $gettext } = useGettext()

// The separator lies in the group's padding: hiding it at the start of a row (see below)
// doesn't change any width, so it can't change where the groups wrap. In the color of borders.
const groupClass =
  'relative inline-flex items-center gap-1 pl-1 before:absolute before:inset-y-0 before:left-0 before:border-l before:border-role-border forced-colors:before:border-[CanvasText] data-row-start:before:hidden'

const canZoomIn = computed(() => scale < MAX_SCALE)
const canZoomOut = computed(() => scale > MIN_SCALE)

// What fits, like in the PDF.js viewer: the rest is in the "More actions" menu. Phones get the
// annotation tools in a picker.
const { isMobile, isTablet } = useIsMobile()
// Shown either here or in the menu, never both.
const inMenu = computed(() => ({
  print: unref(isTablet),
  undo: unref(isTablet),
  zoom: unref(isMobile)
}))

// The same for the annotation tools and the tool picker that replaces them on small screens.
const toolsProps = computed(() => ({
  editorMode,
  params: editorParams,
  savedSignatures,
  disabled: areToolsDisabled
}))
const toolsEvents = {
  selectTool: (mode: number) => emit('selectTool', mode),
  addImage: (source: 'device' | 'cloud') => emit('addImage', source),
  addSavedSignature: (signature: SavedSignature) => emit('addSavedSignature', signature),
  removeSavedSignature: (uuid: string) => emit('removeSavedSignature', uuid),
  updateParam: (mode: number, type: number, value: unknown) =>
    emit('updateParam', mode, type, value),
  openSettings: () => emit('openToolSettings')
}

const items = useTemplateRef<HTMLDivElement>('items')
const pageNumberInput = useTemplateRef<InstanceType<typeof PdfPageNumber>>('pageNumberInput')
const findToggle = useTemplateRef<InstanceType<typeof PdfToolbarButton>>('findToggle')

// Ctrl+Alt+G, like in the PDF.js viewer.
function selectPageNumber() {
  unref(pageNumberInput)?.select()
}

// The focus would be lost with the closed find bar.
function focusFindToggle() {
  unref(findToggle)?.$el.focus()
}

// The find bar opens below it, like in the PDF.js viewer.
const findToggleElement = computed(() => unref(findToggle)?.$el)

defineExpose({ selectPageNumber, focusFindToggle, findToggleElement })

// The separators are between groups, not at the start of a row when the groups wrap. The groups
// change with the screen size and with what the toolbar shows, e.g. the zoom.
function markRowStarts() {
  // A group below the one before starts a new row. Groups of different heights are centered,
  // within a row each one's top is above the bottom of the others.
  let previous: HTMLElement | undefined
  for (const group of unref(items)?.querySelectorAll<HTMLElement>(':scope > *') ?? []) {
    const isRowStart = !!previous && group.offsetTop >= previous.offsetTop + previous.offsetHeight
    group.toggleAttribute('data-row-start', isRowStart)
    previous = group
  }
}

onMounted(markRowStarts)
onUpdated(markRowStarts)
useResizeObserver(items, markRowStarts)
</script>
