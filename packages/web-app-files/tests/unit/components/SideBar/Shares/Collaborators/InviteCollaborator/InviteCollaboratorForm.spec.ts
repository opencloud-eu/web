import { mock } from 'vitest-mock-extended'
import InviteCollaboratorForm from '../../../../../../../src/components/SideBar/Shares/Collaborators/InviteCollaborator/InviteCollaboratorForm.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useCapabilityStore, useMessages, useSharesStore } from '@opencloud-eu/web-pkg'
import {
  CollaboratorAutoCompleteItem,
  CollaboratorShare,
  LinkShare,
  ShareRole,
  ShareTypes
} from '@opencloud-eu/web-client'
import { Contact } from '@opencloud-eu/web-client/ox'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import { OcButton, OcSelect } from '@opencloud-eu/design-system/components'
import RoleDropdown from '../../../../../../../src/components/SideBar/Shares/Collaborators/RoleDropdown.vue'
import { ShareRoleType } from '../../../../../../../src/components/SideBar/Shares/Collaborators/InviteCollaborator/InviteCollaboratorForm.vue'
import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const debounceMode = vi.hoisted(() => ({ real: false }))
vi.mock('lodash-es', async (importOriginal) => {
  const lodash = await importOriginal<typeof import('lodash-es')>()
  return {
    ...lodash,
    debounce: (fn: any, wait: number) => (debounceMode.real ? lodash.debounce(fn, wait) : fn)
  }
})

const announceMock = vi.fn()
const OcHiddenAnnouncerStub = defineComponent({
  setup(_, { expose }) {
    expose({ announce: announceMock })
    return () => h('span')
  }
})

const folderMock = {
  id: '1',
  type: 'folder',
  isFolder: true,
  mdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
  size: '740',
  isMounted: vi.fn(() => true),
  name: 'lorem.txt',
  privateLink: 'some-link',
  canShare: vi.fn(() => true),
  path: '/documents'
} as Resource

const spaceMock = {
  id: '1',
  type: 'space'
}

describe('InviteCollaboratorForm', () => {
  afterEach(() => {
    announceMock.mockReset()
  })
  describe('renders correctly', () => {
    it.todo('renders a select field for share receivers')
    it.todo('renders an inviteDescriptionMessage')
    it.todo('renders a role selector component')
    it.todo('renders an expiration datepicker component')
    it.todo('renders an hidden-announcer')
  })
  describe('invite input', () => {
    it('is named after the visible label', () => {
      const { wrapper } = getWrapper({ shallow: false, props: { label: 'Share with people' } })
      const combobox = wrapper.find('#new-collaborators-form .vs__dropdown-toggle')
      expect(combobox.attributes('aria-label')).toContain('Share with people')
      expect(wrapper.findAll('label').length).toBe(1)
    })
  })
  describe('share options menu', () => {
    it('has a translated name', async () => {
      const { wrapper } = getWrapper({ shallow: false })
      await wrapper.findComponent({ name: 'OcDrop' }).vm.show()
      const list = wrapper.find('.collaborator-edit-dropdown-options-list')
      expect(list.attributes('aria-label')).toBe('Share options')
    })
  })
  describe('share button', () => {
    it('is present', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find('#new-collaborators-form-create-button').exists()).toBeTruthy()
    })
    it('is disabled when no collaborators selected', () => {
      const { wrapper } = getWrapper()
      const btn = wrapper.findComponent<typeof OcButton>('#new-collaborators-form-create-button')
      expect(btn.props('disabled')).toBeTruthy()
    })
    it('is disabled when currently saving', async () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).selectedCollaborators = [mock<CollaboratorAutoCompleteItem>()]
      ;(wrapper.vm as any).saving = true
      await wrapper.vm.$nextTick()
      const btn = wrapper.findComponent<typeof OcButton>('#new-collaborators-form-create-button')
      expect(btn.props('disabled')).toBeTruthy()
    })
    it('is enabled when collaborators selected and not saving', async () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).selectedCollaborators = [mock<CollaboratorAutoCompleteItem>()]
      ;(wrapper.vm as any).saving = false
      await wrapper.vm.$nextTick()
      const btn = wrapper.findComponent<typeof OcButton>('#new-collaborators-form-create-button')
      expect(btn.props('disabled')).toBeFalsy()
    })
  })
  describe('fetching recipients', () => {
    it('queries users and groups', async () => {
      const { wrapper, mocks } = getWrapper()
      await search(wrapper)

      expect(mocks.$clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledTimes(1)
      expect(mocks.$clientService.graphAuthenticated.groups.listGroups).toHaveBeenCalledTimes(1)
    })
    it('fetches users and groups returned from the server', async () => {
      const { wrapper } = getWrapper({ users: [{ id: '2' } as User], groups: [{ id: '3' }] })
      await search(wrapper)

      expect((wrapper.vm as any).autocompleteResults.length).toBe(2)
    })
    it('filters out the current user', async () => {
      const { wrapper } = getWrapper({ users: [{ id: '1' } as User], groups: [{ id: '3' }] })
      await search(wrapper)

      expect((wrapper.vm as any).autocompleteResults.length).toBe(1)
    })
    it('filters out selected users', async () => {
      const { wrapper } = getWrapper({ users: [{ id: '2' } as User], groups: [{ id: '3' }] })
      ;(wrapper.vm as any).selectedCollaborators = [mock<CollaboratorAutoCompleteItem>({ id: '2' })]
      await search(wrapper)

      expect((wrapper.vm as any).autocompleteResults.length).toBe(1)
    })
    it('filters out existing direct shares', async () => {
      const { wrapper } = getWrapper({
        users: [{ id: '2' } as User],
        groups: [{ id: '3' }],
        existingCollaborators: [
          mock<CollaboratorShare>({ sharedWith: { id: '2' }, indirect: false })
        ]
      })

      await search(wrapper)

      expect((wrapper.vm as any).autocompleteResults.length).toBe(1)
    })
    it('does not query Open-Xchange when the capability is disabled', async () => {
      const { wrapper, mocks } = getWrapper({ users: [{ id: '2' } as User] })
      await search(wrapper)

      expect(mocks.$clientService.ox.autocompleteContacts).not.toHaveBeenCalled()
    })
    it('merges Open-Xchange contacts as contact recipients when the capability is enabled', async () => {
      const { wrapper } = getWrapper({
        users: [{ id: '2' } as User],
        openXchange: true,
        openXchangeContacts: [{ id: '10', displayName: 'Jane', email: 'jane@example.com' }]
      })
      await search(wrapper)

      expect((wrapper.vm as any).autocompleteResults.length).toBe(2)
      const contact = (wrapper.vm as any).autocompleteResults.find(
        (r: CollaboratorAutoCompleteItem) => r.shareType === ShareTypes.contact.value
      )
      expect(contact?.mail).toBe('jane@example.com')
    })
    it('queries Open-Xchange with the term without surrounding spaces', async () => {
      const { wrapper, mocks } = getWrapper({ openXchange: true })
      await search(wrapper, ' jane ')

      expect(mocks.$clientService.ox.autocompleteContacts).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'jane' })
      )
    })
    it('does not open the dropdown when the term is only long enough with spaces', () => {
      const { wrapper } = getWrapper()
      useCapabilityStore().capabilities.files_sharing.search_min_length = 2
      const dropdownShouldOpen = wrapper.findComponent(OcSelect).vm.$attrs[
        'dropdown-should-open'
      ] as (options: { open: boolean; search: string }) => boolean

      expect(dropdownShouldOpen({ open: true, search: ' m ' })).toBe(false)
      expect(dropdownShouldOpen({ open: true, search: ' ma ' })).toBe(true)
    })
    it('does not query Open-Xchange when the resource is a space', async () => {
      const { wrapper, mocks } = getWrapper({
        users: [{ id: '2' } as User],
        openXchange: true,
        openXchangeContacts: [{ id: '10', displayName: 'Jane', email: 'jane@example.com' }],
        resource: mock<SpaceResource>(spaceMock)
      })
      await search(wrapper)

      expect(mocks.$clientService.ox.autocompleteContacts).not.toHaveBeenCalled()
    })
    it('offers the entered value as a guest suggestion when it is a valid email address', async () => {
      const { wrapper } = getWrapper({ users: [{ id: '2', mail: 'someone@else.com' } as User] })
      await search(wrapper, 'guest@example.com')

      const guest = (wrapper.vm as any).autocompleteResults.find(
        (r: CollaboratorAutoCompleteItem) => r.shareType === ShareTypes.guest.value
      )
      expect(guest?.id).toBe('guest@example.com')
      expect(guest?.displayName).toBe('guest@example.com')
    })
    it('does not offer a guest suggestion for an invalid email', async () => {
      const { wrapper } = getWrapper()
      await search(wrapper, 'not-an-email')

      expect(
        (wrapper.vm as any).autocompleteResults.some(
          (r: CollaboratorAutoCompleteItem) => r.shareType === ShareTypes.guest.value
        )
      ).toBe(false)
    })
    it('does not offer a guest suggestion without the guest invite permission', async () => {
      const { wrapper } = getWrapper({ canInviteGuests: false })
      await search(wrapper, 'guest@example.com')

      expect(
        (wrapper.vm as any).autocompleteResults.some(
          (r: CollaboratorAutoCompleteItem) => r.shareType === ShareTypes.guest.value
        )
      ).toBe(false)
    })
    it('does not offer a guest suggestion for an address with a display name', async () => {
      const { wrapper } = getWrapper()
      await search(wrapper, 'Test User <guest@example.com>')

      expect(
        (wrapper.vm as any).autocompleteResults.some(
          (r: CollaboratorAutoCompleteItem) => r.shareType === ShareTypes.guest.value
        )
      ).toBe(false)
    })
    it('does not offer a guest suggestion when the server resolves the email to a single user', async () => {
      const { wrapper } = getWrapper({ users: [{ id: '2', displayName: 'Admin' } as User] })
      await search(wrapper, 'admin@example.org')

      expect(
        (wrapper.vm as any).autocompleteResults.some(
          (r: CollaboratorAutoCompleteItem) => r.shareType === ShareTypes.guest.value
        )
      ).toBe(false)
    })
    it('does not offer a guest suggestion in the external share mode', async () => {
      const { wrapper } = getWrapper({ externalShareRoles: [mock<ShareRole>()] })
      ;(wrapper.vm as any).currentShareRoleType = mock<ShareRoleType>({ id: '2' })
      await search(wrapper, 'guest@example.com')

      expect(
        (wrapper.vm as any).autocompleteResults.some(
          (r: CollaboratorAutoCompleteItem) => r.shareType === ShareTypes.guest.value
        )
      ).toBe(false)
    })
    it('does not offer a guest suggestion when the resource is a space', async () => {
      const { wrapper } = getWrapper({ resource: mock<SpaceResource>(spaceMock) })
      await search(wrapper, 'guest@example.com')

      expect(
        (wrapper.vm as any).autocompleteResults.some(
          (r: CollaboratorAutoCompleteItem) => r.shareType === ShareTypes.guest.value
        )
      ).toBe(false)
    })
    it('does not offer a guest suggestion when the email belongs to a known account', async () => {
      const { wrapper } = getWrapper({ users: [{ id: '2', mail: 'guest@example.com' } as User] })
      await search(wrapper, 'guest@example.com')

      expect(
        (wrapper.vm as any).autocompleteResults.some(
          (r: CollaboratorAutoCompleteItem) => r.shareType === ShareTypes.guest.value
        )
      ).toBe(false)
    })
  })
  describe('screen reader announcements', () => {
    const resultAnnouncements = () =>
      announceMock.mock.calls.map(([message]) => message).filter((message) => !!message)

    let typingWrapper: ReturnType<typeof getWrapper>['wrapper'] | undefined
    afterEach(() => {
      typingWrapper?.unmount()
      typingWrapper = undefined
      vi.useRealTimers()
      debounceMode.real = false
    })

    function getTypingWrapper(options: Parameters<typeof getWrapper>[0] = {}) {
      document.body.innerHTML = ''
      const { wrapper, mocks } = getWrapper({ ...options, shallow: false, attachTo: document.body })
      typingWrapper = wrapper
      const input = wrapper.find<HTMLInputElement>('#files-share-invite-input')
      input.element.focus()
      return { wrapper, mocks, input }
    }

    function delaySearch(mocks: ReturnType<typeof getWrapper>['mocks'], users: User[]) {
      let settle: () => void
      mocks.$clientService.graphAuthenticated.users.listUsers.mockImplementationOnce(
        () => new Promise((resolve) => (settle = () => resolve(users)))
      )
      return () => settle()
    }

    it('announces the result count once the search has finished', async () => {
      const { input } = getTypingWrapper({
        users: [{ id: '2', displayName: 'Marie' } as User],
        groups: [{ id: '3', displayName: 'Marketing' }]
      })
      await input.setValue('mar')
      await flushPromises()

      expect(resultAnnouncements()).toEqual(['2 results'])
    })
    it('announces when no users or groups are found', async () => {
      const { input } = getTypingWrapper()
      await input.setValue('unknown')
      await flushPromises()

      expect(resultAnnouncements()).toEqual(['No users or groups found.'])
    })
    it.each([
      {
        cancelledBy: 'clearing the input',
        cancel: (input: DOMWrapper<HTMLInputElement>) => input.setValue('')
      },
      {
        cancelledBy: 'closing the list',
        cancel: (input: DOMWrapper<HTMLInputElement>) =>
          input.trigger('keydown', { key: 'Escape', keyCode: 27 })
      },
      {
        cancelledBy: 'leaving the input',
        cancel: (input: DOMWrapper<HTMLInputElement>) => input.element.blur()
      }
    ])('announces nothing for a search cancelled by $cancelledBy', async ({ cancel }) => {
      const { mocks, input } = getTypingWrapper()
      const settle = delaySearch(mocks, [{ id: '2', displayName: 'Marie' } as User])
      await input.setValue('mar')
      await cancel(input)

      settle()
      await flushPromises()

      expect(resultAnnouncements()).toEqual([])
    })
    it('announces nothing for a refetch below the minimum search length', async () => {
      const { wrapper, input } = getTypingWrapper({
        users: [{ id: '2', displayName: 'Marie' } as User],
        externalShareRoles: [mock<ShareRole>()],
        searchMinLength: 3
      })
      await input.setValue('ma')
      await (wrapper.vm as any).selectShareRoleType({ id: '2', label: 'External' })
      await flushPromises()

      expect(resultAnnouncements()).toEqual([])
    })
    it('announces only the result of the newest query', async () => {
      debounceMode.real = true
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
      const { mocks, input } = getTypingWrapper({
        users: [{ id: '3', displayName: 'Marie' } as User]
      })
      const settleFirst = delaySearch(mocks, [
        { id: '2', displayName: 'Maria' } as User,
        { id: '4', displayName: 'Mario' } as User
      ])
      await input.setValue('ma')
      await vi.advanceTimersByTimeAsync(500)
      // the first search settles while the newer query still waits for its search
      await input.setValue('mar')
      settleFirst()
      await flushPromises()
      await vi.advanceTimersByTimeAsync(500)
      await flushPromises()

      expect(resultAnnouncements()).toEqual(['1 result'])
    })
    it('announces a person being added on selection only', async () => {
      const { wrapper } = getWrapper()
      const select = wrapper.findComponent(OcSelect)
      const person = mock<CollaboratorAutoCompleteItem>({ id: '2' })

      select.vm.$emit('update:model-value', [person])
      await wrapper.vm.$nextTick()
      expect(announceMock).toHaveBeenCalledWith('Person was added')

      select.vm.$emit('update:model-value', [])
      await wrapper.vm.$nextTick()
      expect(announceMock).toHaveBeenCalledTimes(1)
    })
  })
  describe('share action', () => {
    it('creates a public link and emails the contact for address book contact recipients', async () => {
      const { wrapper, mocks } = getWrapper()
      const { addLink, addShare } = useSharesStore()
      vi.mocked(addLink).mockResolvedValue(
        mock<LinkShare>({ webUrl: 'https://cloud.example.com/s/abc' })
      )
      mocks.$clientService.ox.sendMail.mockResolvedValue(undefined)
      ;(wrapper.vm as any).selectedCollaborators = [
        mock<CollaboratorAutoCompleteItem>({
          id: 'contact@example.com',
          mail: 'contact@example.com',
          displayName: 'Contact',
          shareType: ShareTypes.contact.value
        })
      ]
      await wrapper.vm.$nextTick()
      await (wrapper.vm as any).share()

      expect(addLink).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ displayName: 'contact@example.com' })
        })
      )
      expect(mocks.$clientService.ox.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: { name: 'Contact', email: 'contact@example.com' } })
      )
      expect(addShare).not.toHaveBeenCalled()
    })
    it('shows a single pluralized read-only toast for contact invites (and not the generic share toast)', async () => {
      const { wrapper, mocks } = getWrapper()
      const { addLink } = useSharesStore()
      vi.mocked(addLink).mockResolvedValue(
        mock<LinkShare>({ webUrl: 'https://cloud.example.com/s/abc' })
      )
      mocks.$clientService.ox.sendMail.mockResolvedValue(undefined)
      ;(wrapper.vm as any).selectedCollaborators = [
        mock<CollaboratorAutoCompleteItem>({
          id: 'a@example.com',
          mail: 'a@example.com',
          displayName: 'A',
          shareType: ShareTypes.contact.value
        }),
        mock<CollaboratorAutoCompleteItem>({
          id: 'b@example.com',
          mail: 'b@example.com',
          displayName: 'B',
          shareType: ShareTypes.contact.value
        })
      ]
      await wrapper.vm.$nextTick()
      await (wrapper.vm as any).share()

      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledTimes(1)
      expect(showMessage).toHaveBeenCalledWith({ title: 'Sent read-only links to 2 contacts' })
    })
    it('shows the generic share toast for collaborator shares', async () => {
      const { wrapper } = getWrapper()
      const { addShare } = useSharesStore()
      vi.mocked(addShare).mockResolvedValue(mock<CollaboratorShare>())
      ;(wrapper.vm as any).selectedCollaborators = [mock<CollaboratorAutoCompleteItem>({ id: '2' })]
      await wrapper.vm.$nextTick()
      await (wrapper.vm as any).share()

      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledTimes(1)
      expect(showMessage).toHaveBeenCalledWith({ title: 'Share was added successfully' })
    })
    it('clicking the invite-sharees button calls the "share"-action', async () => {
      const { wrapper } = getWrapper()
      const shareSpy = vi.spyOn(wrapper.vm as any, 'share')
      const shareBtn = wrapper.find('#new-collaborators-form-create-button')
      expect(shareBtn.exists()).toBeTruthy()

      await wrapper.vm.$nextTick()
      await shareBtn.trigger('click')
      expect(shareSpy).toHaveBeenCalledTimes(0)
    })
    it.each([
      { storageId: undefined, resource: mock<Resource>(folderMock) },
      { storageId: undefined, resource: mock<SpaceResource>(spaceMock) },
      { storageId: '1', resource: mock<Resource>(folderMock) }
    ] as const)('calls the "addShare" action', async (dataSet) => {
      const { wrapper } = getWrapper({
        storageId: dataSet.storageId,
        resource: dataSet.resource
      })

      ;(wrapper.vm as any).selectedCollaborators = [mock<CollaboratorAutoCompleteItem>()]

      const { addShare } = useSharesStore()
      vi.mocked(addShare).mockResolvedValue(undefined)

      await wrapper.vm.$nextTick()
      await (wrapper.vm as any).share()

      expect(addShare).toHaveBeenCalled()
    })
    it('invites a guest by email only, without objectId or recipient type', async () => {
      const { wrapper } = getWrapper()
      const { addShare } = useSharesStore()
      vi.mocked(addShare).mockResolvedValue(mock<CollaboratorShare>())
      ;(wrapper.vm as any).selectedCollaborators = [
        mock<CollaboratorAutoCompleteItem>({
          id: 'guest@example.com',
          displayName: 'guest@example.com',
          shareType: ShareTypes.guest.value
        })
      ]
      await wrapper.vm.$nextTick()
      await (wrapper.vm as any).share()

      expect(addShare).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            recipients: [{ email: 'guest@example.com' }]
          })
        })
      )
    })
    it('invites users, groups and guests selected together with the matching recipient shape', async () => {
      const { wrapper } = getWrapper()
      const { addShare } = useSharesStore()
      vi.mocked(addShare).mockResolvedValue(mock<CollaboratorShare>())
      ;(wrapper.vm as any).selectedCollaborators = [
        mock<CollaboratorAutoCompleteItem>({
          id: 'user-id',
          displayName: 'Albert Einstein',
          shareType: ShareTypes.user.value
        }),
        mock<CollaboratorAutoCompleteItem>({
          id: 'group-id',
          displayName: 'physics-lovers',
          shareType: ShareTypes.group.value
        }),
        mock<CollaboratorAutoCompleteItem>({
          id: 'guest@example.com',
          displayName: 'guest@example.com',
          shareType: ShareTypes.guest.value
        })
      ]
      await wrapper.vm.$nextTick()
      await (wrapper.vm as any).share()

      expect(addShare).toHaveBeenCalledTimes(3)
      const recipients = vi
        .mocked(addShare)
        .mock.calls.map(([{ options }]: any) => options.recipients[0])
      expect(recipients).toEqual([
        { objectId: 'user-id', '@libre.graph.recipient.type': 'user' },
        { objectId: 'group-id', '@libre.graph.recipient.type': 'group' },
        { email: 'guest@example.com' }
      ])
    })
    it('passes the expiration date along when inviting a guest', async () => {
      const { wrapper } = getWrapper()
      const { addShare } = useSharesStore()
      vi.mocked(addShare).mockResolvedValue(mock<CollaboratorShare>())
      ;(wrapper.vm as any).expirationDate = '2026-10-01T00:00:00.000Z'
      ;(wrapper.vm as any).selectedCollaborators = [
        mock<CollaboratorAutoCompleteItem>({
          id: 'guest@example.com',
          displayName: 'guest@example.com',
          shareType: ShareTypes.guest.value
        })
      ]
      await wrapper.vm.$nextTick()
      await (wrapper.vm as any).share()

      expect(addShare).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            expirationDateTime: '2026-10-01T00:00:00.000Z',
            recipients: [{ email: 'guest@example.com' }]
          })
        })
      )
    })
    it('shows an error message when the guest invite fails', async () => {
      const { wrapper } = getWrapper()
      const { addShare } = useSharesStore()
      const error = new Error('guest invites are disabled')
      vi.mocked(addShare).mockRejectedValue(error)
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      ;(wrapper.vm as any).selectedCollaborators = [
        mock<CollaboratorAutoCompleteItem>({
          id: 'guest@example.com',
          displayName: 'guest@example.com',
          shareType: ShareTypes.guest.value
        })
      ]
      await wrapper.vm.$nextTick()
      await (wrapper.vm as any).share()

      const { showErrorMessage, showMessage } = useMessages()
      expect(showMessage).not.toHaveBeenCalled()
      expect(showErrorMessage).toHaveBeenCalledWith({
        title: 'Failed to add share for "guest@example.com"',
        errors: [error]
      })
    })
    it.todo('resets focus upon selecting an invitee')
  })
  describe('share role type filter', () => {
    it.each([
      { externalRoles: [], available: false },
      { externalRoles: [mock<ShareRole>()], available: true }
    ])(
      'is present depending on the available external share roles',
      ({ externalRoles, available }) => {
        const { wrapper } = getWrapper({ externalShareRoles: externalRoles, shallow: false })
        expect(wrapper.find('.invite-form-share-role-type').exists()).toBe(available)
      }
    )
    it('correctly passes the external prop to the role dropdown component', async () => {
      const externalRoles = [mock<ShareRole>()]
      const { wrapper } = getWrapper({ externalShareRoles: externalRoles })
      ;(wrapper.vm as any).currentShareRoleType = mock<ShareRoleType>({ id: '2' })
      await wrapper.vm.$nextTick()

      const roleDropdown = wrapper.findComponent<typeof RoleDropdown>('role-dropdown-stub')
      expect(roleDropdown.props('isExternal')).toBeTruthy()
    })
    it('is not present for project space resources', () => {
      const space = mock<SpaceResource>({ driveType: 'project' })
      const externalRoles = [mock<ShareRole>()]
      const { wrapper } = getWrapper({ externalShareRoles: externalRoles, resource: space })

      expect(wrapper.find('.invite-form-share-role-type').exists()).toBeFalsy()
    })
  })
})

async function search(wrapper: ReturnType<typeof getWrapper>['wrapper'], query = '') {
  ;(wrapper.vm as any).fetchRecipients(query)
  await flushPromises()
}

function getWrapper({
  storageId = 'fake-storage-id',
  resource = mock<Resource>(folderMock),
  users = [],
  groups = [],
  existingCollaborators = [],
  internalShareRoles = [mock<ShareRole>()],
  externalShareRoles = [],
  user = mock<User>({ id: '1' }),
  openXchange = false,
  openXchangeContacts = [],
  canInviteGuests = true,
  searchMinLength = 2,
  shallow = true,
  props = {},
  attachTo = undefined
}: {
  storageId?: string
  resource?: Resource
  users?: User[]
  groups?: Group[]
  existingCollaborators?: CollaboratorShare[]
  internalShareRoles?: ShareRole[]
  externalShareRoles?: ShareRole[]
  user?: User
  openXchange?: boolean
  openXchangeContacts?: Contact[]
  canInviteGuests?: boolean
  searchMinLength?: number
  shallow?: boolean
  props?: Record<string, unknown>
  attachTo?: HTMLElement
} = {}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ params: { storageId } })
  })

  mocks.$clientService.graphAuthenticated.users.listUsers.mockResolvedValue(users)
  mocks.$clientService.graphAuthenticated.groups.listGroups.mockResolvedValue(groups)
  mocks.$clientService.ox.autocompleteContacts.mockResolvedValue(openXchangeContacts)

  const capabilities = {
    files_sharing: {
      federation: { incoming: true, outgoing: true },
      search_min_length: searchMinLength
    }
  }

  return {
    mocks,
    wrapper: mount(InviteCollaboratorForm, {
      shallow,
      props,
      attachTo,
      global: {
        plugins: [
          ...defaultPlugins({
            abilities: canInviteGuests ? [{ action: 'create-all', subject: 'GuestInvite' }] : [],
            piniaOptions: {
              userState: { user },
              capabilityState: { capabilities },
              configState: {
                options: {
                  concurrentRequests: { shares: { create: 1 } },
                  oxAppSuite: {
                    enabled: openXchange,
                    apiUrl: openXchange ? 'https://ox.example.com/api' : ''
                  }
                }
              },
              sharesState: {
                collaboratorShares: existingCollaborators
              }
            }
          })
        ],
        provide: {
          ...mocks,
          resource,
          availableExternalShareRoles: externalShareRoles,
          availableInternalShareRoles: internalShareRoles
        },
        mocks,
        stubs: { OcSelect: false, RoleDropdown: true, OcHiddenAnnouncer: OcHiddenAnnouncerStub }
      }
    })
  }
}
