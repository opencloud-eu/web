import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { CollaboratorAutoCompleteItem, ShareRole, ShareTypes } from '@opencloud-eu/web-client'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { SpaceMemberInvite } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import SpaceMemberSelect from '../../../../../src/components/Modals/CreateSpace/SpaceMemberSelect.vue'
import RoleDropdown from '../../../../../src/components/SideBar/Shares/Collaborators/RoleDropdown.vue'
import RecipientContainer from '../../../../../src/components/SideBar/Shares/Collaborators/InviteCollaborator/RecipientContainer.vue'

vi.mock('lodash-es', async (importOriginal) => ({
  ...(await importOriginal<typeof import('lodash-es')>()),
  debounce: (fn: unknown) => fn
}))

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

  it('gives the selected members a newly picked role', async () => {
    const { wrapper } = getWrapper()

    await selectCollaborators(wrapper, [collaborator()])
    wrapper.findComponent(RoleDropdown).vm.$emit('optionChange', otherSpaceRole)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([
      [
        {
          id: 'user-1',
          displayName: 'Alice',
          shareType: ShareTypes.user.value,
          roleId: 'space-editor'
        }
      ]
    ])
  })
})

describe('SpaceMemberSelect guest invites', () => {
  it('offers a valid email address as a guest', async () => {
    const { wrapper } = getWrapper({ users: [{ id: '2', mail: 'someone@else.com' } as User] })

    await search(wrapper, 'guest@example.com')

    expect(autocompleteResults(wrapper)).toContainEqual({
      id: 'guest@example.com',
      displayName: 'guest@example.com',
      shareType: ShareTypes.guest.value
    })
  })

  it('does not offer a guest without the guest invite permission', async () => {
    const { wrapper } = getWrapper({ canInviteGuests: false })

    await search(wrapper, 'guest@example.com')

    expect(guestOptions(wrapper)).toEqual([])
  })

  it('does not offer a guest for an email that belongs to a known account', async () => {
    const { wrapper } = getWrapper({ users: [{ id: '2', mail: 'guest@example.com' } as User] })

    await search(wrapper, 'guest@example.com')

    expect(guestOptions(wrapper)).toEqual([])
  })

  it('does not offer a guest that is already selected', async () => {
    const { wrapper } = getWrapper()
    await selectCollaborators(wrapper, [
      mock<CollaboratorAutoCompleteItem>({
        id: 'guest@example.com',
        displayName: 'guest@example.com',
        shareType: ShareTypes.guest.value
      })
    ])

    await search(wrapper, 'guest@example.com')

    expect(guestOptions(wrapper)).toEqual([])
  })

  it('adds a selected guest as a member', async () => {
    const { wrapper } = getWrapper()

    await selectCollaborators(wrapper, [
      mock<CollaboratorAutoCompleteItem>({
        id: 'guest@example.com',
        displayName: 'guest@example.com',
        shareType: ShareTypes.guest.value
      })
    ])

    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([
      [
        {
          id: 'guest@example.com',
          displayName: 'guest@example.com',
          shareType: ShareTypes.guest.value,
          roleId: 'space-viewer'
        }
      ]
    ])
  })
})

type Wrapper = ReturnType<typeof getWrapper>['wrapper']

async function search(wrapper: Wrapper, query: string) {
  memberSelect(wrapper).vm.$emit('search:input', query)
  await flushPromises()
}

function autocompleteResults(wrapper: Wrapper): CollaboratorAutoCompleteItem[] {
  return (wrapper.vm as any).autocompleteResults
}

function guestOptions(wrapper: Wrapper) {
  return autocompleteResults(wrapper).filter(
    ({ shareType }) => shareType === ShareTypes.guest.value
  )
}

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
  roleId = '',
  users = [] as User[],
  canInviteGuests = true
} = {}) {
  const mocks = defaultComponentMocks()
  mocks.$clientService.graphAuthenticated.users.listUsers.mockResolvedValue(users)
  mocks.$clientService.graphAuthenticated.groups.listGroups.mockResolvedValue([])

  const wrapper = mount(SpaceMemberSelect, {
    props: {
      modelValue,
      roleId,
      'onUpdate:roleId': (id: string) => wrapper.setProps({ roleId: id })
    },
    global: {
      plugins: [
        ...defaultPlugins({
          abilities: canInviteGuests ? [{ action: 'create-all', subject: 'GuestInvite' }] : [],
          piniaOptions: {
            sharesState: { graphRoles },
            userState: { user: mock<User>({ id: 'me' }) }
          }
        })
      ],
      mocks,
      provide: mocks
    }
  })

  return { mocks, wrapper }
}
