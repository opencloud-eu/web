import PhotoRollItem from '../../../src/components/PhotoRollItem.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  PartialComponentProps,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { MediaFile } from '../../../src/helpers/types'

describe('PhotoRoll component', () => {
  it('emits a "select"-event on click', async () => {
    const { wrapper } = getWrapper()
    const button = wrapper.find('oc-button-stub')
    await button.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
  })
})

function getWrapper(props: PartialComponentProps<typeof PhotoRollItem> = {}) {
  const defaultMocks = defaultComponentMocks()

  return {
    wrapper: shallowMount(PhotoRollItem, {
      props: {
        item: mock<MediaFile>(),
        isActive: true,
        ...props
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks: defaultMocks,
        provide: defaultMocks
      }
    })
  }
}
