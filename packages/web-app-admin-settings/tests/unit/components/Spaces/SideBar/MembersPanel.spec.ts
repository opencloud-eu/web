import MembersPanel from '../../../../../src/components/Spaces/SideBar/MembersPanel.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { ShareRole, SpaceResource } from '@opencloud-eu/web-client'
import MembersRoleSection from '../../../../../src/components/Spaces/SideBar/MembersRoleSection.vue'
import { Permission } from '@opencloud-eu/web-client/graph/generated'

const graphRoles = {
  '1': mock<ShareRole>({ id: '1', displayName: 'Managers', rolePermissions: [] }),
  '2': mock<ShareRole>({ id: '2', displayName: 'Editors', rolePermissions: [] }),
  '3': mock<ShareRole>({ id: '3', displayName: 'Viewers', rolePermissions: [] })
}

const spaceMock = {
  root: {
    permissions: [
      mock<Permission>({ grantedToV2: { user: { displayName: 'admin' } }, roles: ['1'] }),
      mock<Permission>({ grantedToV2: { user: { displayName: 'marie' } }, roles: ['2'] }),
      mock<Permission>({ grantedToV2: { user: { displayName: 'einstein' } }, roles: ['3'] })
    ]
  }
} as undefined as SpaceResource

const selectors = {
  membersRolePanelStub: 'members-role-section-stub',
  spaceMembersCustom: '.space-members-custom'
}

describe('MembersPanel', () => {
  it('should render all members accordingly to their role assignments', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('should filter members accordingly to the entered search term', async () => {
    const userToFilterFor = spaceMock.root.permissions[2]
    const { wrapper } = getWrapper()
    const input = wrapper.find('input')
    await input.setValue('ein')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll(selectors.membersRolePanelStub).length).toBe(1)
    expect(
      wrapper.findComponent<typeof MembersRoleSection>(selectors.membersRolePanelStub).props()
        .permissions[0].grantedToV2.user.displayName
    ).toEqual(userToFilterFor.grantedToV2.user.displayName)
  })
  it('should display an empty result if no matching members found', async () => {
    const { wrapper } = getWrapper()
    const input = wrapper.find('input')
    await input.setValue('no-match')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll(selectors.membersRolePanelStub).length).toBe(0)
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('should display members without role under the custom section', () => {
    const spaceResource = {
      root: {
        permissions: [mock<Permission>({ grantedToV2: { user: { displayName: 'admin' } } })]
      }
    } as undefined as SpaceResource
    const { wrapper } = getWrapper({ spaceResource })
    expect(wrapper.find(selectors.spaceMembersCustom).exists()).toBeTruthy()
  })
})

function getWrapper({ spaceResource = spaceMock } = {}) {
  return {
    wrapper: shallowMount(MembersPanel, {
      global: {
        stubs: { OcTextInput: false },
        plugins: [...defaultPlugins({ piniaOptions: { sharesState: { graphRoles } } })],
        provide: { resource: spaceResource }
      }
    })
  }
}
