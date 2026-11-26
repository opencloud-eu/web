import { computed, unref, type EmitFn, type ShortEmitsToObject } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import { ScrollMode, SpreadMode } from 'pdfjs-dist/web/pdf_viewer.mjs'

export type MoreMenuItem = {
  id: string
  icon: string
  fillType?: 'line' | 'none'
  label: string
  isActive?: boolean
  isDisabled?: boolean
  handler: () => void
  /** Of a view option, e.g. the scroll mode. */
  mode?: number
}

export type MoreMenuGroup = {
  id: string
  items: MoreMenuItem[]
  label?: string
  /** The class of view options instead of the one from the id, e.g. for tests. */
  optionClass?: string
}

/** The props of PdfMoreMenu. */
export type MoreMenuProps = {
  /** What the toolbar has no room for, see PdfToolbar. */
  inMenu: { print: boolean; undo: boolean; zoom: boolean }
  scrollMode: number
  spreadMode: number
  canUndo?: boolean
  canRedo?: boolean
  /** Undo and redo only where the document can be edited. */
  canAnnotate?: boolean
  /** The browser allows full screen. */
  canPresent?: boolean
  isPrinting?: boolean
  isHandToolActive?: boolean
  /** An annotation tool is active, which pauses text selection and hand tool. */
  isToolActive?: boolean
  /** Not beyond the zoom limits. */
  canZoomIn?: boolean
  canZoomOut?: boolean
  isFirstPage?: boolean
  isLastPage?: boolean
}

/** The events of PdfMoreMenu that its items emit. */
export type MoreMenuEvents = {
  undo: []
  redo: []
  zoomIn: []
  zoomOut: []
  print: []
  present: []
  firstPage: []
  lastPage: []
  rotate: [delta: 90 | -90]
  setHandTool: [isChosen: boolean]
  setScrollMode: [mode: number]
  setSpreadMode: [mode: number]
}

function onlyIf(condition: boolean, ...items: MoreMenuItem[]) {
  return condition ? items : []
}

/** A view option, e.g. a scroll mode: the current one is marked, choosing one sets it. */
function viewOptions(
  options: { mode: number; icon: string; label: string }[],
  current: number,
  select: (mode: number) => void
): MoreMenuItem[] {
  return options.map(({ mode, icon, label }) => ({
    id: String(mode),
    mode,
    icon,
    label,
    isActive: mode === current,
    handler: () => select(mode)
  }))
}

/**
 * The groups of the "More actions" menu, empty ones are left out. Takes the (reactive) props and
 * the emit of PdfMoreMenu.
 */
export function usePdfMoreMenu(
  props: MoreMenuProps,
  emit: EmitFn<ShortEmitsToObject<MoreMenuEvents>>
) {
  const { $gettext } = useGettext()

  // Phones (touch) get no presentation mode and no hand tool.
  const { isMobile } = useIsMobile()

  // Like the secondary toolbar of the PDF.js viewer, with the same choices and names.
  const groups = computed<MoreMenuGroup[]>(() =>
    [
      {
        id: 'output',
        items: [
          ...onlyIf(props.inMenu.print, {
            id: 'print',
            icon: 'printer',
            label: $gettext('Print'),
            isDisabled: props.isPrinting,
            handler: () => emit('print')
          }),
          ...onlyIf(props.canPresent && !unref(isMobile), {
            id: 'present',
            icon: 'presentation',
            label: $gettext('Presentation mode'),
            handler: () => emit('present')
          })
        ]
      },
      {
        id: 'edit',
        items: [
          ...onlyIf(
            props.canAnnotate && props.inMenu.undo,
            {
              id: 'undo',
              icon: 'arrow-go-back',
              label: $gettext('Undo'),
              isDisabled: !props.canUndo,
              handler: () => emit('undo')
            },
            {
              id: 'redo',
              icon: 'arrow-go-forward',
              label: $gettext('Redo'),
              isDisabled: !props.canRedo,
              handler: () => emit('redo')
            }
          )
        ]
      },
      {
        id: 'zoom',
        items: [
          ...onlyIf(
            props.inMenu.zoom,
            {
              id: 'zoom-in',
              icon: 'zoom-in',
              label: $gettext('Zoom in'),
              isDisabled: !props.canZoomIn,
              handler: () => emit('zoomIn')
            },
            {
              id: 'zoom-out',
              icon: 'zoom-out',
              label: $gettext('Zoom out'),
              isDisabled: !props.canZoomOut,
              handler: () => emit('zoomOut')
            }
          )
        ]
      },
      {
        id: 'navigation',
        items: [
          {
            id: 'first-page',
            icon: 'skip-up',
            label: $gettext('Go to first page'),
            isDisabled: props.isFirstPage,
            handler: () => emit('firstPage')
          },
          {
            id: 'last-page',
            icon: 'skip-down',
            label: $gettext('Go to last page'),
            isDisabled: props.isLastPage,
            handler: () => emit('lastPage')
          }
        ]
      },
      {
        id: 'rotate',
        items: [
          {
            id: 'rotate-cw',
            icon: 'clockwise',
            label: $gettext('Rotate clockwise'),
            handler: () => emit('rotate', 90)
          },
          {
            id: 'rotate-ccw',
            icon: 'anticlockwise',
            label: $gettext('Rotate counterclockwise'),
            handler: () => emit('rotate', -90)
          }
        ]
      },
      {
        id: 'cursor',
        items: [
          ...onlyIf(
            !unref(isMobile),
            {
              id: 'text-selection',
              icon: 'cursor',
              label: $gettext('Text selection tool'),
              isActive: !props.isHandToolActive,
              // Like in the PDF.js viewer: both pause while annotating.
              isDisabled: props.isToolActive,
              handler: () => emit('setHandTool', false)
            },
            {
              id: 'hand-tool',
              icon: 'hand',
              fillType: 'none',
              label: $gettext('Hand tool'),
              isActive: props.isHandToolActive,
              isDisabled: props.isToolActive,
              handler: () => emit('setHandTool', true)
            }
          )
        ]
      },
      {
        id: 'scroll',
        label: $gettext('Scrolling'),
        optionClass: 'pdf-viewer-scroll-option',
        items: viewOptions(
          [
            { mode: ScrollMode.PAGE, icon: 'file-paper', label: $gettext('Page scrolling') },
            {
              mode: ScrollMode.VERTICAL,
              icon: 'arrow-up-down',
              label: $gettext('Vertical scrolling')
            },
            {
              mode: ScrollMode.HORIZONTAL,
              icon: 'arrow-left-right',
              label: $gettext('Horizontal scrolling')
            },
            { mode: ScrollMode.WRAPPED, icon: 'layout-grid', label: $gettext('Wrapped scrolling') }
          ],
          props.scrollMode,
          (mode) => emit('setScrollMode', mode)
        )
      },
      {
        id: 'spread',
        label: $gettext('Pages side by side'),
        optionClass: 'pdf-viewer-spread-option',
        items: viewOptions(
          [
            { mode: SpreadMode.NONE, icon: 'file', label: $gettext('No spreads') },
            { mode: SpreadMode.ODD, icon: 'book-open', label: $gettext('Odd spreads') },
            { mode: SpreadMode.EVEN, icon: 'pages', label: $gettext('Even spreads') }
          ],
          props.spreadMode,
          (mode) => emit('setSpreadMode', mode)
        )
      }
    ].filter(({ items }) => items.length)
  )

  return { groups }
}
