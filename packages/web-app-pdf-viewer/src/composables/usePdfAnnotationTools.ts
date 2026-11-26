import { computed, toValue, type MaybeRefOrGetter, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { AnnotationEditorParamsType, AnnotationEditorType } from 'pdfjs-dist'
import { highlightColors, type HighlightColorName } from '../helpers/highlightColors'
import type { SavedSignature } from './usePdfSignatureStorage'
import { useCanPickImageFromCloud } from './usePdfCloudImagePicker'

export type ToolSettingValue = string | number | boolean

export type ToolSetting = {
  id: string
  label: string
  type: 'color' | 'range' | 'swatches' | 'switch'
  /** The PDF.js parameter (AnnotationEditorParamsType) the setting changes. */
  paramType: number
  /** Same as the PDF.js editors, until PDF.js reports the value. */
  default: ToolSettingValue
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
  disabled?: boolean
}

/** PdfAnnotationTools and PdfToolPicker, which is shown instead on small screens, share them. */
export type AnnotationToolsProps = {
  editorMode: number
  /**
   * The settings by parameter type as PDF.js reports them, like the inputs of the PDF.js
   * viewer show them: of the selected annotation, otherwise the defaults for new ones.
   */
  params?: Map<number, unknown>
  savedSignatures?: SavedSignature[]
  disabled?: boolean
}

export type AnnotationToolsEmits = {
  selectTool: [mode: number]
  addImage: [source: 'device' | 'cloud']
  addSavedSignature: [signature: SavedSignature]
  removeSavedSignature: [uuid: string]
  /** E.g. to finish the drawing, which the settings would change then. */
  openSettings: []
  updateParam: [mode: number, type: number, value: unknown]
}

/**
 * The annotation tools of the toolbar, in its order, and their settings, for the toolbar and
 * the tool picker on small screens.
 */
export function usePdfAnnotationTools({
  params
}: {
  /** See AnnotationToolsProps. */
  params: MaybeRefOrGetter<Map<number, unknown>>
}) {
  const { $gettext } = useGettext()

  function getValues(settings: ToolSetting[]) {
    return Object.fromEntries(
      settings.map((setting) => [
        setting.id,
        (toValue(params).get(setting.paramType) as ToolSettingValue) ?? setting.default
      ])
    )
  }

  const canPickFromCloud = useCanPickImageFromCloud()
  const imageSources = computed(() => [
    { id: 'device' as const, icon: 'image', label: $gettext('From this device') },
    ...(unref(canPickFromCloud)
      ? [{ id: 'cloud' as const, icon: 'cloud', label: $gettext('From cloud') }]
      : [])
  ])

  const tools = computed(() => {
    const highlightColorLabels: Record<HighlightColorName, string> = {
      yellow: $gettext('Yellow'),
      green: $gettext('Green'),
      blue: $gettext('Blue'),
      pink: $gettext('Pink'),
      red: $gettext('Red')
    }
    return [
      {
        id: 'signature',
        mode: AnnotationEditorType.SIGNATURE,
        icon: 'quill-pen',
        label: $gettext('Add signature')
      },
      {
        id: 'highlight',
        mode: AnnotationEditorType.HIGHLIGHT,
        icon: 'mark-pen',
        label: $gettext('Highlight text'),
        settingsLabel: $gettext('Highlight settings'),
        settings: [
          {
            id: 'highlight-color',
            label: $gettext('Color'),
            type: 'swatches',
            options: highlightColors.map(({ name, value }) => ({
              value,
              label: highlightColorLabels[name]
            })),
            paramType: AnnotationEditorParamsType.HIGHLIGHT_COLOR,
            default: highlightColors[0].value
          },
          {
            id: 'highlight-thickness',
            label: $gettext('Thickness of free highlights'),
            type: 'range',
            min: 8,
            max: 24,
            paramType: AnnotationEditorParamsType.HIGHLIGHT_THICKNESS,
            default: 12,
            // Only free highlights (drawn with the tool) have a thickness.
            disabled: toValue(params).get(AnnotationEditorParamsType.HIGHLIGHT_FREE) === false
          },
          {
            id: 'highlight-show-all',
            // Same label as in the PDF.js viewer.
            label: $gettext('Show all'),
            type: 'switch',
            paramType: AnnotationEditorParamsType.HIGHLIGHT_SHOW_ALL,
            default: true
          }
        ] satisfies ToolSetting[]
      },
      {
        id: 'freetext',
        mode: AnnotationEditorType.FREETEXT,
        icon: 'font-size',
        fillType: 'none' as const,
        label: $gettext('Add text'),
        settingsLabel: $gettext('Text settings'),
        settings: [
          {
            id: 'freetext-color',
            label: $gettext('Color'),
            type: 'color',
            paramType: AnnotationEditorParamsType.FREETEXT_COLOR,
            default: '#000000'
          },
          {
            id: 'freetext-size',
            label: $gettext('Size'),
            type: 'range',
            min: 5,
            max: 100,
            paramType: AnnotationEditorParamsType.FREETEXT_SIZE,
            default: 10
          }
        ] satisfies ToolSetting[]
      },
      {
        id: 'ink',
        mode: AnnotationEditorType.INK,
        icon: 'pencil',
        label: $gettext('Draw'),
        settingsLabel: $gettext('Drawing settings'),
        settings: [
          {
            id: 'ink-color',
            label: $gettext('Color'),
            type: 'color',
            paramType: AnnotationEditorParamsType.INK_COLOR,
            default: '#000000'
          },
          {
            id: 'ink-thickness',
            label: $gettext('Thickness'),
            type: 'range',
            min: 1,
            max: 20,
            paramType: AnnotationEditorParamsType.INK_THICKNESS,
            default: 1
          },
          {
            id: 'ink-opacity',
            label: $gettext('Opacity'),
            type: 'range',
            min: 0.05,
            max: 1,
            step: 0.05,
            paramType: AnnotationEditorParamsType.INK_OPACITY,
            default: 1
          }
        ] satisfies ToolSetting[]
      },
      {
        id: 'stamp',
        mode: AnnotationEditorType.STAMP,
        icon: 'image',
        label: $gettext('Add image')
      },
      {
        id: 'comments',
        mode: AnnotationEditorType.POPUP,
        icon: 'chat-3',
        label: $gettext('Comments')
      }
    ]
  })

  return { tools, imageSources, getValues }
}
