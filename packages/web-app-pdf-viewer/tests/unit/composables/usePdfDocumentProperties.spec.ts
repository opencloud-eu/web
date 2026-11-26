import { flushPromises } from '@vue/test-utils'
import { nextTick, ref, shallowRef, unref } from 'vue'
import { mock } from 'vitest-mock-extended'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { Resource } from '@opencloud-eu/web-client'
import { useSideBar } from '@opencloud-eu/web-pkg'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfDocumentProperties } from '../../../src/composables/usePdfDocumentProperties'
import {
  documentPropertiesPanelName,
  useDocumentPropertiesPanelState
} from '../../../src/composables/useDocumentPropertiesPanelState'
import {
  getDocumentProperties,
  type DocumentProperties
} from '../../../src/helpers/documentProperties'

vi.mock('../../../src/helpers/documentProperties', () => ({
  getDocumentProperties: vi.fn()
}))

function propertiesOfPage(pageNumber: number): DocumentProperties {
  return { pageCount: 3, isLinearized: false, title: `page ${pageNumber}` }
}

let unmount: (() => void) | undefined

function setup({
  isSideBarOpen = true,
  activePanel = documentPropertiesPanelName as string | null
} = {}) {
  localStorage.setItem('oc_sideBarOpen', String(isSideBarOpen))
  const pdfDocument = mock<PDFDocumentProxy>()
  const pageNumber = ref(2)
  let showProperties: () => void
  let sideBar: ReturnType<typeof useSideBar>
  const wrapper = getComposableWrapper(
    () => {
      sideBar = useSideBar()
      ;({ showProperties } = usePdfDocumentProperties({
        pdfDocument: shallowRef(pdfDocument),
        resource: ref(mock<Resource>({ id: 'file-1' })),
        pageNumber,
        rotation: ref(90)
      }))
    },
    { pluginOptions: { piniaOptions: { sideBarStore: { sideBarActivePanel: activePanel } } } }
  )
  unmount = () => wrapper.unmount()
  return { pdfDocument, pageNumber, showProperties, sideBar }
}

describe('usePdfDocumentProperties', () => {
  beforeEach(() => {
    vi.mocked(getDocumentProperties).mockImplementation((_doc, { pageNumber }) =>
      Promise.resolve(propertiesOfPage(pageNumber))
    )
  })

  afterEach(() => {
    unmount?.()
    unmount = undefined
    vi.clearAllMocks()
  })

  it('opens its panel in the right sidebar', () => {
    const { showProperties, sideBar } = setup({ activePanel: null })
    showProperties()
    expect(sideBar.openSideBarPanel).toHaveBeenCalledWith(documentPropertiesPanelName)
  })

  it('shows the properties of the current page and rotation while the panel is shown', async () => {
    const { pdfDocument, pageNumber } = setup()
    const { properties } = useDocumentPropertiesPanelState()
    await flushPromises()
    expect(getDocumentProperties).toHaveBeenCalledWith(pdfDocument, {
      pageNumber: 2,
      rotation: 90,
      locale: navigator.language
    })
    expect(unref(properties).title).toBe('page 2')
    pageNumber.value = 3
    await flushPromises()
    expect(unref(properties).title).toBe('page 3')
  })

  // Hiding the sidebar keeps its active panel.
  it('does not load them while the sidebar is hidden', async () => {
    setup({ isSideBarOpen: false })
    await flushPromises()
    expect(getDocumentProperties).not.toHaveBeenCalled()
  })

  it('shows the properties of the latest page when they arrive out of order', async () => {
    let resolveFirst: (properties: DocumentProperties) => void
    vi.mocked(getDocumentProperties).mockImplementationOnce(
      () => new Promise((resolve) => (resolveFirst = resolve))
    )
    const { pageNumber } = setup()
    const { properties } = useDocumentPropertiesPanelState()
    await nextTick()
    pageNumber.value = 3
    await flushPromises()
    resolveFirst(propertiesOfPage(2))
    await flushPromises()
    expect(unref(properties).title).toBe('page 3')
  })

  // The panel is only offered for the open document, not in other sidebars.
  it('shares which document is open until it is closed', async () => {
    setup()
    const { resourceId, properties } = useDocumentPropertiesPanelState()
    await flushPromises()
    expect(unref(resourceId)).toBe('file-1')
    unmount()
    expect(unref(resourceId)).toBeUndefined()
    expect(unref(properties)).toBeUndefined()
  })
})
