import { mock } from 'vitest-mock-extended'
import { useScrollTo } from '../../../../src/composables/scrollTo'
import { Resource } from '@opencloud-eu/web-client'
import {
  getComposableWrapper,
  RouteLocation,
  defaultComponentMocks
} from '@opencloud-eu/web-test-helpers'
import { useSideBar } from '../../../../src'

const mockResourceId = 'fakeResourceId'
const mockFilesTopBar = {
  offsetHeight: 75
}

describe('useScrollTo', () => {
  it('should be valid', () => {
    expect(useScrollTo).toBeDefined()
  })
  describe('method "scrollToResource"', () => {
    const getHTMLPageObject = () => ({
      getBoundingClientRect: vi.fn(() => ({ bottom: 300, top: 0 })),
      scrollIntoView: vi.fn(),
      scrollBy: vi.fn(),
      offsetHeight: 100
    })

    it('does nothing when no element was found', () => {
      const htmlPageObject = getHTMLPageObject()
      vi.spyOn(document, 'querySelectorAll').mockImplementation(() => [] as any)
      vi.spyOn(document, 'getElementById').mockImplementation(() => mockFilesTopBar as HTMLElement)

      const mocks = defaultComponentMocks()

      getComposableWrapper(
        () => {
          const { scrollToResource } = useScrollTo()
          scrollToResource(mockResourceId)
          expect(htmlPageObject.scrollIntoView).not.toHaveBeenCalled()
        },
        { mocks, provide: mocks }
      )
    })
    it('calls "scrollIntoView" when the page bottom is reached', () => {
      const htmlPageObject = getHTMLPageObject()
      vi.spyOn(document, 'querySelectorAll').mockImplementation(() => [htmlPageObject] as any)
      vi.spyOn(document, 'getElementById').mockImplementation(() => mockFilesTopBar as HTMLElement)

      window.innerHeight = 100

      const mocks = defaultComponentMocks()

      getComposableWrapper(
        () => {
          const { scrollToResource } = useScrollTo()
          scrollToResource(mockResourceId)
          expect(htmlPageObject.scrollIntoView).toHaveBeenCalled()
        },
        { mocks, provide: mocks }
      )
    })
    it('calls "scrollIntoView" when the page top is reached', () => {
      const htmlPageObject = getHTMLPageObject()
      vi.spyOn(document, 'querySelectorAll').mockImplementation(() => [htmlPageObject] as any)
      vi.spyOn(document, 'getElementById').mockImplementation(() => mockFilesTopBar as HTMLElement)

      window.innerHeight = 500

      const mocks = defaultComponentMocks()

      getComposableWrapper(
        () => {
          const { scrollToResource } = useScrollTo()
          scrollToResource(mockResourceId)
          expect(htmlPageObject.scrollIntoView).toHaveBeenCalled()
        },
        { mocks, provide: mocks }
      )
    })
  })
  describe('method "scrollToResourceFromRoute"', () => {
    const resourceId = 'someFileId'

    it('does not scroll without the "scrollTo" param', () => {
      const mocks = { ...defaultComponentMocks() }

      getComposableWrapper(
        () => {
          const resource = mock<Resource>({ id: resourceId })
          const { scrollToResourceFromRoute } = useScrollTo()
          const querySelectorAllSpy = vi.spyOn(document, 'querySelectorAll')
          scrollToResourceFromRoute([resource], 'files-app-bar')
          expect(querySelectorAllSpy).not.toHaveBeenCalled()
        },
        { mocks, provide: mocks }
      )
    })
    it('does not scroll when no resource found', () => {
      const mocks = {
        ...defaultComponentMocks({
          currentRoute: mock<RouteLocation>({ query: { scrollTo: resourceId } })
        })
      }

      getComposableWrapper(
        () => {
          const resource = mock<Resource>({ id: 'someOtherFileId' })
          const { scrollToResourceFromRoute } = useScrollTo()
          const querySelectorAllSpy = vi.spyOn(document, 'querySelectorAll')
          scrollToResourceFromRoute([resource], 'files-app-bar')
          expect(querySelectorAllSpy).not.toHaveBeenCalled()
        },
        { mocks, provide: mocks }
      )
    })
    it('does not scroll when resource is processing', () => {
      const mocks = {
        ...defaultComponentMocks({
          currentRoute: mock<RouteLocation>({ query: { scrollTo: resourceId } })
        })
      }

      getComposableWrapper(
        () => {
          const resource = mock<Resource>({ id: resourceId, processing: true })
          const { scrollToResourceFromRoute } = useScrollTo()
          const querySelectorAllSpy = vi.spyOn(document, 'querySelectorAll')
          scrollToResourceFromRoute([resource], 'files-app-bar')
          expect(querySelectorAllSpy).not.toHaveBeenCalled()
        },
        { mocks, provide: mocks }
      )
    })
    it('scrolls to the resource when the "scrollTo" param is given and a resource is found', () => {
      const store = { commit: vi.fn() }
      const mocks = {
        ...defaultComponentMocks({
          currentRoute: mock<RouteLocation>({ query: { scrollTo: resourceId } })
        })
      }

      getComposableWrapper(
        () => {
          const resource = mock<Resource>({ id: resourceId })
          const { scrollToResourceFromRoute } = useScrollTo()
          const querySelectorAllSpy = vi.spyOn(document, 'querySelectorAll')
          scrollToResourceFromRoute([resource], 'files-app-bar')
          expect(querySelectorAllSpy).toHaveBeenCalled()
        },
        {
          mocks,
          provide: {
            ...mocks,
            store
          }
        }
      )
    })
    it('opens the sidebar when a resource is found and the "details" param is given', () => {
      const store = { commit: vi.fn() }
      const mocks = {
        ...defaultComponentMocks({
          currentRoute: mock<RouteLocation>({
            query: { scrollTo: resourceId, details: 'details' }
          })
        })
      }

      getComposableWrapper(
        () => {
          const resource = mock<Resource>({ id: resourceId })
          const { scrollToResourceFromRoute } = useScrollTo()
          scrollToResourceFromRoute([resource], 'files-app-bar')
          const { openSideBarPanel } = useSideBar()
          expect(openSideBarPanel).toHaveBeenCalled()
        },
        {
          mocks,
          provide: {
            ...mocks,
            store
          }
        }
      )
    })
  })
})
