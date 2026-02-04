import PhotoRoll from '../../../src/components/PhotoRoll.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  PartialComponentProps,
  mount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { MediaFile } from '../../../src/helpers/types'
import PhotoRollItem from '../../../src/components/PhotoRollItem.vue'
import { useLoadPreview } from '@opencloud-eu/web-pkg/src'

let mockItemsInViewPort = Infinity
let observerCount = 0

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useLoadPreview: vi.fn().mockReturnValue({
    loadPreview: vi.fn()
  }),
  VisibilityObserver: vi.fn().mockImplementation(function (this: any) {
    this.observe = vi.fn((element, { onEnter }) => {
      observerCount++
      if (onEnter && observerCount <= mockItemsInViewPort) {
        onEnter({ unobserve: vi.fn() })
      }
    })
    this.disconnect = vi.fn()
  })
}))

describe('PhotoRoll component', () => {
  beforeEach(() => {
    mockItemsInViewPort = Infinity
    observerCount = 0
    vi.clearAllMocks()
  })

  it('renders photos as photo-roll–items', () => {
    const photos = [mock<MediaFile>(), mock<MediaFile>()]
    const { wrapper } = getWrapper({ items: photos })
    expect(wrapper.findAllComponents(PhotoRollItem).length).toBe(photos.length)
  })

  it('renders previews for photo-roll-items in the view port', () => {
    const photos = [mock<MediaFile>(), mock<MediaFile>(), mock<MediaFile>()]
    getWrapper({ items: photos })
    const { loadPreview } = useLoadPreview()
    expect(loadPreview).toBeCalledTimes(photos.length)
  })

  it('does not render previews for photo roll items outside the viewport', () => {
    const photos = [mock<MediaFile>(), mock<MediaFile>(), mock<MediaFile>(), mock<MediaFile>()]
    mockItemsInViewPort = photos.length - 1
    getWrapper({ items: photos })
    const { loadPreview } = useLoadPreview()
    expect(loadPreview).toBeCalledTimes(photos.length - 1)
  })
})

function getWrapper(props: PartialComponentProps<typeof PhotoRoll> = {}) {
  const defaultMocks = defaultComponentMocks()

  return {
    wrapper: mount(PhotoRoll, {
      props: {
        items: [mock<MediaFile>()],
        activeIndex: 0,
        ...props
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: { 'resource-icon': true }
      }
    })
  }
}
