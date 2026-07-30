import MembersPanel from '../../../../../src/components/Spaces/SideBar/MembersPanel.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { VueWrapper } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import { ShareRole, SpaceResource } from '@opencloud-eu/web-client'
import MembersRoleSection from '../../../../../src/components/Spaces/SideBar/MembersRoleSection.vue'
import { Permission } from '@opencloud-eu/web-client/graph/generated'
import { OcPaginationInline } from '@opencloud-eu/design-system/components'

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
  spaceMembersCustom: '.space-members-custom',
  roleSection: '[data-testid^="space-members-role-"]',
  memberListItem: '[data-testid="space-members-list"]',
  pagination: '[data-testid="space-members-pagination"]'
}

function spaceWithMembers(amount: number, roleIds: string[] = ['1']): SpaceResource {
  return {
    root: {
      permissions: Array.from({ length: amount }, (_, index) => {
        const paddedIndex = index.toString().padStart(2, '0')
        return mock<Permission>({
          id: `permission-${paddedIndex}`,
          grantedToV2: {
            user: { id: `user-${paddedIndex}`, displayName: `User ${paddedIndex}` }
          },
          roles: [roleIds[index % roleIds.length]]
        })
      })
    }
  } as undefined as SpaceResource
}

describe('MembersPanel', () => {
  it('should render all members accordingly to their role assignments', () => {
    const { wrapper } = getWrapper()

    expect(rolesOnPage(wrapper)).toEqual(['Managers', 'Editors', 'Viewers'])
    expect(
      wrapper
        .findAllComponents<typeof MembersRoleSection>(selectors.membersRolePanelStub)
        .map((section) => section.props().permissions[0].grantedToV2.user.displayName)
    ).toEqual(['admin', 'marie', 'einstein'])
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
    expect(wrapper.text()).toContain('No members found')
  })
  describe('pagination', () => {
    it('limits the displayed members to 20 per page', () => {
      const { wrapper } = getWrapper({ spaceResource: spaceWithMembers(25) })

      expect(
        wrapper.findComponent<typeof OcPaginationInline>(selectors.pagination).props('pages')
      ).toBe(2)
      expect(
        wrapper.findComponent<typeof MembersRoleSection>(selectors.membersRolePanelStub).props()
          .permissions
      ).toHaveLength(20)
    })
    it('shows the remaining members on the next page', async () => {
      const { wrapper } = getWrapper({ spaceResource: spaceWithMembers(25) })
      await goToPage(wrapper, 2)

      expect(
        wrapper
          .findComponent<typeof MembersRoleSection>(selectors.membersRolePanelStub)
          .props()
          .permissions.map((p: Permission) => p.grantedToV2.user.displayName)
      ).toEqual(['User 20', 'User 21', 'User 22', 'User 23', 'User 24'])
    })
    it('keeps the members of a role on the same page', async () => {
      const { wrapper } = getWrapper({ spaceResource: spaceWithMembers(25, ['1', '2']) })

      expect(rolesOnPage(wrapper)).toEqual(['Managers', 'Editors'])
      await goToPage(wrapper, 2)
      expect(rolesOnPage(wrapper)).toEqual(['Editors'])
    })
    it('does not leave highlighted text of the previous page behind', async () => {
      const { wrapper } = getWrapper({
        spaceResource: spaceWithMembers(25),
        mountType: mount
      })
      await wrapper.find('input').setValue('User')
      await wrapper.vm.$nextTick()
      await goToPage(wrapper, 2)

      // the leading `U2` is the initials of the rendered avatar
      expect(wrapper.findAll(selectors.memberListItem).map((item) => item.text())).toEqual([
        'U2 User 20',
        'U2 User 21',
        'U2 User 22',
        'U2 User 23',
        'U2 User 24'
      ])
    })
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

function rolesOnPage(wrapper: VueWrapper): string[] {
  return wrapper
    .findAll(selectors.roleSection)
    .map((section) => section.attributes('data-testid').replace('space-members-role-', ''))
}

function goToPage(wrapper: VueWrapper, page: number) {
  wrapper
    .findComponent<typeof OcPaginationInline>(selectors.pagination)
    .vm.$emit('update:currentPage', page)

  return wrapper.vm.$nextTick()
}

function getWrapper({
  spaceResource = spaceMock,
  mountType = shallowMount
}: {
  spaceResource?: SpaceResource
  mountType?: typeof mount | typeof shallowMount
} = {}) {
  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: mountType(MembersPanel, {
      global: {
        stubs: { OcSearchBar: false },
        plugins: [...defaultPlugins({ piniaOptions: { sharesState: { graphRoles } } })],
        provide: { resource: spaceResource, ...mocks },
        mocks
      }
    })
  }
}
