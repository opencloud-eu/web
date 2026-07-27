import MembersPanel from '../../../../../src/components/Groups/SideBar/MembersPanel.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import MembersRoleSection from '../../../../../src/components/Groups/SideBar/MembersRoleSection.vue'
import { useMessages } from '@opencloud-eu/web-pkg'

const groupMock = mock<Group>({ id: '1', groupTypes: [] })
const members = [mock<User>({ displayName: 'Albert Einstein' })]

const selectors = {
  membersRolePanelStub: 'members-role-section-stub',
  groupMembers: '[data-testid="group-members"]',
  spinnerStub: 'oc-spinner-stub'
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
  it('should display an empty result if no matching members found', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()
    ;(wrapper.vm as any).filterTerm = 'no-match'
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll(selectors.membersRolePanelStub).length).toBe(0)
    expect(wrapper.find(selectors.groupMembers).exists()).toBeFalsy()
  })
})

function getWrapper({
  group = groupMock,
  members: groupMembers = members,
  rejectGetGroup = false,
  omitMembers = false
}: {
  group?: Group
  members?: User[]
  rejectGetGroup?: boolean
  omitMembers?: boolean
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
    wrapper: shallowMount(MembersPanel, {
      global: {
        plugins: [...defaultPlugins()],
        provide: { group, ...mocks },
        mocks
      }
    })
  }
}
