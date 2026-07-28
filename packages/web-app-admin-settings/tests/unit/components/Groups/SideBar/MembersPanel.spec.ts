import MembersPanel from '../../../../../src/components/Groups/SideBar/MembersPanel.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { flushPromises, VueWrapper } from '@vue/test-utils'
import { OcPaginationInline } from '@opencloud-eu/design-system/components'
import { mock } from 'vitest-mock-extended'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import MembersRoleSection from '../../../../../src/components/Groups/SideBar/MembersRoleSection.vue'
import { useMessages } from '@opencloud-eu/web-pkg'

const groupMock = mock<Group>({ id: '1', groupTypes: [] })
const members = [mock<User>({ displayName: 'Albert Einstein' })]

const selectors = {
  membersRolePanelStub: 'members-role-section-stub',
  groupMembers: '[data-testid="group-members"]',
  spinnerStub: 'oc-spinner-stub',
  paginationStub: 'oc-pagination-inline-stub',
  nextPageButton: '[data-testid="group-members-pagination"] .oc-pagination-inline-next'
}

function generateMembers(amount: number): User[] {
  return Array.from({ length: amount }, (_, index) =>
    mock<User>({
      id: `user-${index.toString().padStart(2, '0')}`,
      displayName: `User ${index.toString().padStart(2, '0')}`
    })
  )
}

describe('MembersPanel', () => {
  it('loads the members of the given group', async () => {
    const { wrapper, mocks } = getWrapper()
    await flushPromises()

    expect(mocks.$clientService.graphAuthenticated.groups.getGroup).toHaveBeenCalledWith(
      groupMock.id,
      { expand: ['members'] },
      expect.anything()
    )
    expect(wrapper.find(selectors.groupMembers).exists()).toBeTruthy()
    expect(
      wrapper.findComponent<typeof MembersRoleSection>(selectors.membersRolePanelStub).props()
        .groupMembers
    ).toEqual(members)
  })
  it('sorts the members by their display name', async () => {
    const { wrapper } = getWrapper({
      members: [
        mock<User>({ displayName: 'Marie Curie' }),
        mock<User>({ displayName: 'Albert Einstein' })
      ]
    })
    await flushPromises()

    expect(
      wrapper
        .findComponent<typeof MembersRoleSection>(selectors.membersRolePanelStub)
        .props()
        .groupMembers.map(({ displayName }) => displayName)
    ).toEqual(['Albert Einstein', 'Marie Curie'])
  })
  it('shows a spinner while the members are being loaded', async () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.spinnerStub).exists()).toBeTruthy()

    await flushPromises()
    expect(wrapper.find(selectors.spinnerStub).exists()).toBeFalsy()
  })
  it('shows a message if loading the members fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { wrapper } = getWrapper({ rejectGetGroup: true })
    await flushPromises()

    expect(consoleSpy).toHaveBeenCalled()
    expect(useMessages().showErrorMessage).toHaveBeenCalled()
    expect(wrapper.find(selectors.groupMembers).exists()).toBeFalsy()
    expect(wrapper.findAll(selectors.membersRolePanelStub).length).toBe(0)
  })
  it('shows no members if the loaded group has none', async () => {
    const { wrapper } = getWrapper({ omitMembers: true })
    await flushPromises()

    expect(useMessages().showErrorMessage).not.toHaveBeenCalled()
    expect(wrapper.find(selectors.groupMembers).exists()).toBeFalsy()
  })
  it('should filter members accordingly to the entered search term', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()
    ;(wrapper.vm as any).filterTerm = 'ein'
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll(selectors.membersRolePanelStub).length).toBe(1)
    expect(
      wrapper.findComponent<typeof MembersRoleSection>(selectors.membersRolePanelStub).props()
        .groupMembers[0].displayName
    ).toEqual('Albert Einstein')
  })
  describe('pagination', () => {
    it('renders a single page if all members fit on one page', async () => {
      const { wrapper } = getWrapper({ members: generateMembers(20) })
      await flushPromises()

      expect(
        wrapper.findComponent<typeof OcPaginationInline>(selectors.paginationStub).props('pages')
      ).toBe(1)
    })
    it('limits the displayed members to 20 per page', async () => {
      const { wrapper } = getWrapper({ members: generateMembers(25) })
      await flushPromises()

      expect(
        wrapper.findComponent<typeof OcPaginationInline>(selectors.paginationStub).props('pages')
      ).toBe(2)
      expect(
        wrapper.findComponent<typeof MembersRoleSection>(selectors.membersRolePanelStub).props()
          .groupMembers
      ).toHaveLength(20)
    })
    it('shows the remaining members on the next page', async () => {
      const { wrapper } = getWrapper({ members: generateMembers(25) })
      await flushPromises()
      await goToPage(wrapper, 2)

      const displayedMembers = wrapper
        .findComponent<typeof MembersRoleSection>(selectors.membersRolePanelStub)
        .props()
        .groupMembers.map(({ displayName }) => displayName)
      expect(displayedMembers).toEqual(['User 20', 'User 21', 'User 22', 'User 23', 'User 24'])
    })
    it('resets to the first page when the filter term changes', async () => {
      const { wrapper } = getWrapper({ members: generateMembers(25) })
      await flushPromises()
      await goToPage(wrapper, 2)
      ;(wrapper.vm as any).filterTerm = 'User'
      await wrapper.vm.$nextTick()

      expect(
        wrapper.findComponent<typeof MembersRoleSection>(selectors.membersRolePanelStub).props()
          .groupMembers
      ).toHaveLength(20)
    })
    it('only loads the avatars of the current page', async () => {
      const { wrapper, mocks } = getWrapper({ members: generateMembers(50), mountType: mount })
      await flushPromises()

      const getUserPhoto = mocks.$clientService.graphAuthenticated.photos.getUserPhoto
      expect(getUserPhoto).toHaveBeenCalledTimes(20)

      vi.mocked(getUserPhoto).mockClear()
      await wrapper.find(selectors.nextPageButton).trigger('click')
      await flushPromises()

      expect(getUserPhoto).toHaveBeenCalledTimes(20)
      expect(getUserPhoto).toHaveBeenCalledWith('user-20', expect.anything())
    })
  })
  it('should display an empty result if no matching members found', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()
    ;(wrapper.vm as any).filterTerm = 'no-match'
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll(selectors.membersRolePanelStub).length).toBe(0)
    expect(wrapper.find(selectors.groupMembers).exists()).toBeFalsy()
  })
})

function goToPage(wrapper: VueWrapper, page: number) {
  wrapper
    .findComponent<typeof OcPaginationInline>(selectors.paginationStub)
    .vm.$emit('update:currentPage', page)

  return wrapper.vm.$nextTick()
}

function getWrapper({
  group = groupMock,
  members: groupMembers = members,
  rejectGetGroup = false,
  omitMembers = false,
  mountType = shallowMount
}: {
  group?: Group
  members?: User[]
  rejectGetGroup?: boolean
  omitMembers?: boolean
  mountType?: typeof mount | typeof shallowMount
} = {}) {
  const mocks = defaultComponentMocks()

  const getGroupMock = mocks.$clientService.graphAuthenticated.groups.getGroup
  if (rejectGetGroup) {
    getGroupMock.mockRejectedValue(new Error(''))
  } else {
    getGroupMock.mockResolvedValue(
      omitMembers ? { id: group.id } : mock<Group>({ ...group, members: groupMembers })
    )
  }

  return {
    mocks,
    wrapper: mountType(MembersPanel, {
      global: {
        plugins: [...defaultPlugins()],
        provide: { group, ...mocks },
        mocks
      }
    })
  }
}
