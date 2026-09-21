import { mock } from 'vitest-mock-extended'
import { CollaboratorAutoCompleteItem, ShareRole, ShareTypes } from '@opencloud-eu/web-client'
import { SpaceMemberInvite } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import SpaceMemberSelect from '../../../../../src/components/Modals/CreateSpace/SpaceMemberSelect.vue'
import RoleDropdown from '../../../../../src/components/SideBar/Shares/Collaborators/RoleDropdown.vue'
import RecipientContainer from '../../../../../src/components/SideBar/Shares/Collaborators/InviteCollaborator/RecipientContainer.vue'

const spaceRole = mock<ShareRole>({
  id: 'space-viewer',
  displayName: 'Can view',
  rolePermissions: [{ condition: 'exists @Resource.Root' }]
})
const otherSpaceRole = mock<ShareRole>({
  id: 'space-editor',
  displayName: 'Can edit',
  rolePermissions: [{ condition: 'exists @Resource.Root' }]
})
const fileRole = mock<ShareRole>({
  id: 'file-viewer',
  displayName: 'Can view file',
  rolePermissions: [{ condition: 'exists @Resource.File' }]
})

describe('SpaceMemberSelect', () => {
  it('only offers roles that apply to a space', () => {
    const { wrapper } = getWrapper()

    // the shared role dropdown reads them from the provided injection
    const roles = wrapper.findComponent(RoleDropdown).text()
    expect(roles).toContain('Can view')
    expect(roles).not.toContain('Can view file')
  })

  it('composes the members from the selected recipients and the role', async () => {
    const { wrapper } = getWrapper()

    await selectCollaborators(wrapper, [
      collaborator(),
      collaborator({ id: 'group-1', group: true })
    ])

    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([
      [
        {
          id: 'user-1',
          displayName: 'Alice',
          shareType: ShareTypes.user.value,
          roleId: 'space-viewer'
        },
        {
          id: 'group-1',
          displayName: 'Alice',
          shareType: ShareTypes.group.value,
          roleId: 'space-viewer'
        }
      ]
    ])
  })

  it('keeps no members without a role to give them', async () => {
    const { wrapper } = getWrapper({ graphRoles: { [fileRole.id]: fileRole } })

    await selectCollaborators(wrapper, [collaborator()])

    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([[]])
  })

  it('shows the members it is given, so a remount does not look empty', () => {
    const { wrapper } = getWrapper({
      modelValue: [
        {
          id: 'user-1',
          displayName: 'Alice',
          shareType: ShareTypes.user.value,
          roleId: 'space-viewer'
        }
      ]
    })

    expect(wrapper.findAllComponents(RecipientContainer).map((c) => c.props('recipient'))).toEqual([
      { id: 'user-1', displayName: 'Alice', shareType: ShareTypes.user.value }
    ])
  })

  it('shows the role it is given rather than the first one', () => {
    const { wrapper } = getWrapper({ roleId: 'space-editor' })

    expect(wrapper.findComponent(RoleDropdown).props('existingShareRole')).toMatchObject({
      id: 'space-editor'
    })
  })

  it('reports a picked role, so a step change does not reset it', async () => {
    const { wrapper } = getWrapper()

    wrapper.findComponent(RoleDropdown).vm.$emit('optionChange', otherSpaceRole)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:roleId').at(-1)).toEqual(['space-editor'])
  })
})

type Wrapper = ReturnType<typeof getWrapper>['wrapper']

function collaborator({ id = 'user-1', group = false } = {}) {
  return mock<CollaboratorAutoCompleteItem>({
    id,
    displayName: 'Alice',
    shareType: group ? ShareTypes.group.value : ShareTypes.user.value
  })
}

function memberSelect(wrapper: Wrapper) {
  return wrapper.findComponent<any>({ name: 'OcSelect' })
}

function selectCollaborators(wrapper: Wrapper, collaborators: CollaboratorAutoCompleteItem[]) {
  memberSelect(wrapper).vm.$emit('update:modelValue', collaborators)
  return wrapper.vm.$nextTick()
}

function getWrapper({
  graphRoles = {
    [spaceRole.id]: spaceRole,
    [otherSpaceRole.id]: otherSpaceRole,
    [fileRole.id]: fileRole
  },
  modelValue = [] as SpaceMemberInvite[],
  roleId = ''
} = {}) {
  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: mount(SpaceMemberSelect, {
      props: { modelValue, roleId },
      global: {
        plugins: [...defaultPlugins({ piniaOptions: { sharesState: { graphRoles } } })],
        mocks,
        provide: mocks
      }
    })
  }
}
