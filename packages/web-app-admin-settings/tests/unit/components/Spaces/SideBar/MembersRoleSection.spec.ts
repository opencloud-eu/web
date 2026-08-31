import { Permission } from '@opencloud-eu/web-client/graph/generated'
import MembersRoleSection from '../../../../../src/components/Spaces/SideBar/MembersRoleSection.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'

describe('MembersRoleSection', () => {
  it('should render all members accordingly', () => {
    const permissions = [
      mock<Permission>({ grantedToV2: { user: { displayName: 'einstein' }, group: undefined } }),
      mock<Permission>({
        grantedToV2: { group: { displayName: 'physic-lovers' }, user: undefined }
      })
    ]
    const { wrapper } = getWrapper({ permissions })
    const members = wrapper.findAll('[data-testid="space-members-list"]')

    expect(members.map((member) => member.text())).toEqual(['einstein', 'physic-lovers'])
    expect(members[0].find('user-avatar-stub').exists()).toBeTruthy()
    expect(members[1].find('oc-avatar-item-stub').exists()).toBeTruthy()
  })
})

function getWrapper({ permissions = [] }: { permissions?: Permission[] } = {}) {
  return {
    wrapper: shallowMount(MembersRoleSection, {
      props: {
        permissions
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: { OcFilterHighlight: false }
      }
    })
  }
}
