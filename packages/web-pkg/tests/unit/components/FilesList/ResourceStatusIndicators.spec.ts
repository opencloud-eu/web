import { ComponentProps, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import ResourceStatusIndicators from '../../../../src/components/FilesList/ResourceStatusIndicators.vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { OcStatusIndicators } from '@opencloud-eu/design-system/components'
import {
  ResourceIndicator,
  useResourceIndicators
} from '../../../../src/composables/resources/useResourceIndicators'

vi.mock('../../../../src/composables/resources/useResourceIndicators', () => ({
  useResourceIndicators: vi.fn()
}))

describe('ResourceStatusIndicators component', () => {
  it('renders indicators from getIndicators', () => {
    const space = mock<SpaceResource>({ driveType: 'project' })
    const resource = mock<Resource>({ id: 'resource' })

    const indicators = [
      {
        id: 'some-id',
        type: 'some-type',
        category: 'system',
        label: 'label',
        accessibleDescription: 'accessible description',
        icon: 'download',
        fillType: 'fill'
      }
    ] satisfies ResourceIndicator[]

    vi.mocked(useResourceIndicators).mockReturnValue({ getIndicators: () => indicators })

    const wrapper = getWrapper({ space, resource })
    expect(wrapper.findComponent(OcStatusIndicators).props('indicators')).toEqual(indicators)
  })
  function getWrapper(props: ComponentProps<typeof ResourceStatusIndicators>) {
    return shallowMount(ResourceStatusIndicators, {
      props,
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
})
