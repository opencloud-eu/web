import { unref } from 'vue'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { AnnotationEditorParamsType } from 'pdfjs-dist'
import { usePdfAnnotationTools } from '../../../src/composables/usePdfAnnotationTools'

function setup({ params = new Map<number, unknown>(), isPublicLink = false } = {}) {
  let tools: ReturnType<typeof usePdfAnnotationTools>
  getComposableWrapper(
    () => {
      tools = usePdfAnnotationTools({ params })
    },
    { pluginOptions: { piniaOptions: { authState: { publicLinkContextReady: isPublicLink } } } }
  )
  return tools
}

function getSettings(tools: ReturnType<typeof usePdfAnnotationTools>, id: string) {
  return unref(tools.tools).find((tool) => tool.id === id).settings
}

describe('usePdfAnnotationTools', () => {
  it('reports the values of PDF.js, the defaults of its editors until then', () => {
    const tools = setup({ params: new Map([[AnnotationEditorParamsType.INK_THICKNESS, 7]]) })
    expect(tools.getValues(getSettings(tools, 'ink'))).toEqual({
      'ink-color': '#000000',
      'ink-thickness': 7,
      'ink-opacity': 1
    })
    expect(tools.getValues(getSettings(tools, 'highlight'))).toEqual({
      'highlight-color': '#FFFF98',
      'highlight-thickness': 12,
      'highlight-show-all': true
    })
  })

  it.each([
    [false, ['device', 'cloud']],
    // The file picker only shows the shared files there.
    [true, ['device']]
  ])('offers images from (public link: %s) %s', (isPublicLink, sources) => {
    expect(unref(setup({ isPublicLink }).imageSources).map(({ id }) => id)).toEqual(sources)
  })
})
