import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import DefaultSpaceHeader from '../../../../src/components/Spaces/DefaultSpaceHeader.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'

describe('DefaultSpaceHeader', () => {
  it('does not render the space header in the personal space', () => {
    const wrapper = getWrapper({
      currentSpace: mock<SpaceResource>({ driveType: 'personal' }),
      currentFolder: mock<Resource>({ path: '/' })
    })
    expect(wrapper.find('space-header-stub').exists()).toBeFalsy()
  })
  it('does not render the space header in a nested project space folder', () => {
    const wrapper = getWrapper({
      currentSpace: mock<SpaceResource>({ driveType: 'project' }),
      currentFolder: mock<Resource>({ path: '/someFolder' })
    })
    expect(wrapper.find('space-header-stub').exists()).toBeFalsy()
  })
  it('renders the space header on a space frontpage', () => {
    const wrapper = getWrapper({
      currentSpace: mock<SpaceResource>({ driveType: 'project' }),
      currentFolder: mock<Resource>({ path: '/' })
    })
    expect(wrapper.find('space-header-stub').exists()).toBeTruthy()
  })
})

function getWrapper({
  currentSpace,
  currentFolder
}: {
  currentSpace: SpaceResource
  currentFolder: Resource
}) {
  return shallowMount(DefaultSpaceHeader, {
    global: {
      plugins: [
        ...defaultPlugins({
          piniaOptions: {
            spacesState: { currentSpace },
            resourcesStore: { currentFolder }
          }
        })
      ]
    }
  })
}
