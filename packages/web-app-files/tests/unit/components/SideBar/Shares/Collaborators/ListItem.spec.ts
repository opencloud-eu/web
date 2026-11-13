import ListItem from '../../../../../../src/components/SideBar/Shares/Collaborators/ListItem.vue'
import {
  CollaboratorShare,
  GraphSharePermission,
  ShareRole,
  ShareTypes,
  UNIFIED_ROLE_DENIED_ID
} from '@opencloud-eu/web-client'
import {
  defaultPlugins,
  mount,
  defaultStubs,
  defaultComponentMocks,
  nextTicks
} from '@opencloud-eu/web-test-helpers'
import { useMessages, useSharesStore } from '@opencloud-eu/web-pkg'
import EditDropdown from '../../../../../../src/components/SideBar/Shares/Collaborators/EditDropdown.vue'
import RoleDropdown from '../../../../../../src/components/SideBar/Shares/Collaborators/RoleDropdown.vue'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { RouteLocationNamedRaw } from 'vue-router'
import { DateTime } from 'luxon'

const selectors = {
  userAvatarImage: 'user-avatar-stub.files-collaborators-collaborator-indicator',
  notUserAvatar: 'oc-avatar-item-stub.files-collaborators-collaborator-indicator',
  collaboratorName: '.files-collaborators-collaborator-name',
  collaboratorRole: '.files-collaborators-collaborator-role',
  shareInheritanceIndicators: '.files-collaborators-collaborator-shared-via',
  expirationDateIcon: '[data-testid="recipient-info-expiration-date"]',
  externalContextHelper: '.files-collaborators-collaborator-name-wrapper .oc-contextual-helper'
}

const getShareMock = ({
  sharedWith,
  shareType,
  expirationDateTime
}: Partial<CollaboratorShare> = {}): CollaboratorShare => ({
  id: '1',
  sharedWith: sharedWith || { id: '3', displayName: 'einstein' },
  sharedBy: { id: '2', displayName: 'marie' },
  permissions: [],
  shareType: shareType || ShareTypes.user.value,
  role: mock<ShareRole>({ description: '', displayName: '' }),
  resourceId: '1',
  indirect: false,
  expirationDateTime: expirationDateTime || '',
  createdDateTime: '2024-01-01'
})

describe('Collaborator ListItem component', () => {
  describe('displays the correct image/icon according to the shareType', () => {
    describe('user share type', () => {
      it('should display a users avatar', () => {
        const { wrapper } = createWrapper({
          share: getShareMock({ shareType: ShareTypes.user.value })
        })
        expect(wrapper.find(selectors.userAvatarImage).exists()).toBeTruthy()
        expect(wrapper.find(selectors.notUserAvatar).exists()).toBeFalsy()
      })
      it('sets user info on the avatar', () => {
        const share = getShareMock()
        const { wrapper } = createWrapper({ share })
        expect(wrapper.find(selectors.userAvatarImage).attributes('userid')).toEqual(
          share.sharedWith.id
        )
        expect(wrapper.find(selectors.userAvatarImage).attributes('username')).toEqual(
          share.sharedWith.displayName
        )
      })
    })
    describe('non-user share types', () => {
      it.each(ShareTypes.all.filter((shareType) => shareType !== ShareTypes.user))(
        'should display an oc-avatar-item for any non-user share types',
        (shareType) => {
          const { wrapper } = createWrapper({ share: getShareMock({ shareType: shareType.value }) })
          expect(wrapper.find(selectors.userAvatarImage).exists()).toBeFalsy()
          expect(wrapper.find(selectors.notUserAvatar).exists()).toBeTruthy()
          expect(wrapper.find(selectors.notUserAvatar).attributes().name).toEqual(shareType.key)
        }
      )
      it('should display an oc-avatar-item for space group shares', () => {
        const { wrapper } = createWrapper({
          share: getShareMock({
            shareType: ShareTypes.group.value,
            sharedWith: { id: '1', displayName: 'someGroup' }
          })
        })
        expect(wrapper.find(selectors.userAvatarImage).exists()).toBeFalsy()
        expect(wrapper.find(selectors.notUserAvatar).exists()).toBeTruthy()
      })
    })
  })
  describe('share info', () => {
    it('shows the collaborator display name', () => {
      const share = getShareMock()
      const { wrapper } = createWrapper({ share })
      expect(wrapper.find(selectors.collaboratorName).text()).toEqual(share.sharedWith.displayName)
    })
    it('shows the full collaborator display name as title', () => {
      const share = getShareMock({
        sharedWith: { id: '3', displayName: 'Albert Einstein with a very long display name' }
      })
      const { wrapper } = createWrapper({ share })
      expect(wrapper.find(selectors.collaboratorName).attributes('title')).toEqual(
        share.sharedWith.displayName
      )
    })
    it.each([
      ['User', ShareTypes.user],
      ['Group', ShareTypes.group]
    ])('tells screen readers that the receiver is a %s', (typeText, shareType) => {
      const share = getShareMock({ shareType: shareType.value })
      const { wrapper } = createWrapper({ share })
      expect(wrapper.find('.files-collaborators-collaborator-name + .sr-only').text()).toBe(
        `Share receiver name: ${share.sharedWith.displayName}, ${typeText}`
      )
    })
    it('shows the share expiration date if given', () => {
      const { wrapper } = createWrapper({
        share: getShareMock({ expirationDateTime: '2000-01-01' })
      })
      expect(wrapper.find(selectors.expirationDateIcon).exists()).toBeTruthy()
    })
  })
  describe('modifiable property', () => {
    it('shows interactive elements when modifiable', () => {
      const { wrapper } = createWrapper({ modifiable: true })
      expect(wrapper.find(selectors.collaboratorRole).exists()).toBeTruthy()
    })
    it('hides interactive elements when not modifiable', () => {
      const { wrapper } = createWrapper({ modifiable: false })
      expect(wrapper.find(selectors.collaboratorRole).exists()).toBeFalsy()
    })
  })
  describe('share inheritance indicators', () => {
    it('show when sharedParentRoute is given', () => {
      const { wrapper } = createWrapper({
        sharedParentRoute: { params: { driveAliasAndItem: '/folder' } }
      })
      expect(wrapper.find(selectors.shareInheritanceIndicators).exists()).toBeTruthy()
      expect(wrapper.html()).toMatchSnapshot()
    })
    it('do not show when sharedParentRoute is not given', () => {
      const { wrapper } = createWrapper()
      expect(wrapper.find(selectors.shareInheritanceIndicators).exists()).toBeFalsy()
    })
  })
  describe('remove share', () => {
    it('emits the "removeShare" event', () => {
      const { wrapper } = createWrapper()
      wrapper.findComponent<typeof EditDropdown>('edit-dropdown-stub').vm.$emit('removeShare')
      expect(wrapper.emitted().onDelete).toBeTruthy()
    })
  })
  describe('change share role', () => {
    it('calls "changeShare" for regular resources', () => {
      const { wrapper } = createWrapper()
      wrapper.findComponent<typeof RoleDropdown>('role-dropdown-stub').vm.$emit('optionChange', {
        permissions: [GraphSharePermission.readBasic]
      })
      const sharesStore = useSharesStore()
      expect(sharesStore.updateShare).toHaveBeenCalled()
    })
    it('shows a message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper } = createWrapper()
      const sharesStore = useSharesStore()
      vi.mocked(sharesStore.updateShare).mockRejectedValue(new Error())
      wrapper.findComponent<typeof RoleDropdown>('role-dropdown-stub').vm.$emit('optionChange', {
        share: getShareMock({ shareType: ShareTypes.user.value })
      })

      await nextTicks(4)

      const messagesStore = useMessages()
      expect(messagesStore.showErrorMessage).toHaveBeenCalled()
    })
    it('reverts the displayed role to the saved one when saving fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const savedRole = mock<ShareRole>({ id: 'viewer', displayName: 'Can view', description: '' })
      const newRole = mock<ShareRole>({ id: 'editor', displayName: 'Can edit', description: '' })
      const share = getShareMock()
      share.role = savedRole
      const { wrapper } = createWrapper({
        share,
        stubRoleDropdown: false,
        availableInternalShareRoles: [savedRole, newRole]
      })
      const sharesStore = useSharesStore()
      vi.mocked(sharesStore.updateShare).mockRejectedValue(new Error())

      const label = `${selectors.collaboratorRole} .files-recipient-role-select-btn .truncate`
      expect(wrapper.find(label).text()).toEqual('Can view')

      await wrapper.find(`#files-recipient-role-drop-btn-${newRole.id}`).trigger('click')
      await nextTicks(4)

      // the save was actually attempted (and rejected)
      expect(sharesStore.updateShare).toHaveBeenCalled()
      // ... so the dropdown must show the previously saved role again, not the new one
      expect(wrapper.find(label).text()).toEqual('Can view')
    })
    it('keeps the new role if the role change succeeds but the space refresh fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const savedRole = mock<ShareRole>({ id: 'viewer', displayName: 'Can view', description: '' })
      const newRole = mock<ShareRole>({ id: 'editor', displayName: 'Can edit', description: '' })
      const share = getShareMock()
      share.role = savedRole
      const { wrapper, mocks } = createWrapper({
        share,
        stubRoleDropdown: false,
        availableInternalShareRoles: [savedRole, newRole],
        resource: mock<SpaceResource>({ id: 'space-1', driveType: 'project' })
      })
      const sharesStore = useSharesStore()
      // the role PATCH succeeds, but the subsequent project-space refresh fails
      mocks.$clientService.graphAuthenticated.drives.getDrive.mockRejectedValue(new Error())

      const label = `${selectors.collaboratorRole} .files-recipient-role-select-btn .truncate`
      await wrapper.find(`#files-recipient-role-drop-btn-${newRole.id}`).trigger('click')
      await nextTicks(4)

      expect(sharesStore.updateShare).toHaveBeenCalled()
      // the role was persisted, so the dropdown must keep the new role
      expect(wrapper.find(label).text()).toEqual('Can edit')
    })
    it('sends the new role when replacing custom permissions with a role', async () => {
      const share = getShareMock()
      share.role = undefined
      share.permissions = [GraphSharePermission.readBasic]
      const { wrapper } = createWrapper({ share })
      const newRole = mock<ShareRole>({ id: 'editor', displayName: 'Can edit', description: '' })
      wrapper
        .findComponent<typeof RoleDropdown>('role-dropdown-stub')
        .vm.$emit('optionChange', newRole)
      await nextTicks(4)

      const sharesStore = useSharesStore()
      expect(sharesStore.updateShare).toHaveBeenCalledWith(
        expect.objectContaining({ options: expect.objectContaining({ roles: ['editor'] }) })
      )
    })
  })
  describe('change expiration date', () => {
    it('calls "changeShare" for regular resources', () => {
      const { wrapper } = createWrapper()
      wrapper
        .findComponent<typeof EditDropdown>('edit-dropdown-stub')
        .vm.$emit('expirationDateChanged', {
          shareExpirationChanged: new Date()
        })
      const sharesStore = useSharesStore()
      expect(sharesStore.updateShare).toHaveBeenCalled()
    })
    it('shows a message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper } = createWrapper()
      const sharesStore = useSharesStore()
      vi.mocked(sharesStore.updateShare).mockRejectedValue(new Error())
      wrapper
        .findComponent<typeof EditDropdown>('edit-dropdown-stub')
        .vm.$emit('expirationDateChanged', {
          shareExpirationChanged: new Date()
        })

      await nextTicks(4)

      const messagesStore = useMessages()
      expect(messagesStore.showErrorMessage).toHaveBeenCalled()
    })
    it('keeps the role of a share with a role', async () => {
      const share = getShareMock()
      share.role = mock<ShareRole>({ id: 'viewer', displayName: 'Can view', description: '' })
      const { wrapper } = createWrapper({ share })
      const expirationDateTime = DateTime.fromISO('2030-01-01T00:00:00.000Z')
      wrapper
        .findComponent<typeof EditDropdown>('edit-dropdown-stub')
        .vm.$emit('expirationDateChanged', { expirationDateTime })
      await nextTicks(4)

      const sharesStore = useSharesStore()
      expect(sharesStore.updateShare).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { roles: ['viewer'], expirationDateTime: expirationDateTime.toISO() }
        })
      )
    })
    it('saves the expiration date of a share with custom permissions', async () => {
      const share = getShareMock()
      share.role = undefined
      const { wrapper } = createWrapper({ share })
      const expirationDateTime = DateTime.fromISO('2030-01-01T00:00:00.000Z')
      wrapper
        .findComponent<typeof EditDropdown>('edit-dropdown-stub')
        .vm.$emit('expirationDateChanged', { expirationDateTime })
      await nextTicks(4)

      const sharesStore = useSharesStore()
      const messagesStore = useMessages()
      expect(sharesStore.updateShare).toHaveBeenCalledTimes(1)
      const { options } = vi.mocked(sharesStore.updateShare).mock.calls[0][0]
      expect(options).toEqual({ expirationDateTime: expirationDateTime.toISO() })
      expect(options).not.toHaveProperty('roles')
      expect(messagesStore.showErrorMessage).not.toHaveBeenCalled()
      expect(messagesStore.showMessage).toHaveBeenCalled()
    })
  })
  describe('external user shares', () => {
    it('correctly identifies external shares', () => {
      const share = getShareMock({ shareType: ShareTypes.remote.value })
      const { wrapper } = createWrapper({ share })
      const roleDropDown = wrapper.findComponent<typeof RoleDropdown>('role-dropdown-stub')

      expect(roleDropDown.props('isExternal')).toBeTruthy()
      expect(wrapper.find(selectors.externalContextHelper).exists()).toBeTruthy()
    })
    it('does not identify guest shares as external', () => {
      const share = getShareMock({ shareType: ShareTypes.guest.value })
      const { wrapper } = createWrapper({ share })
      const roleDropDown = wrapper.findComponent<typeof RoleDropdown>('role-dropdown-stub')

      expect(roleDropDown.props('isExternal')).toBeFalsy()
      expect(wrapper.find(selectors.externalContextHelper).exists()).toBeFalsy()
    })
  })
  describe('deny role', () => {
    const viewerRole = mock<ShareRole>({ id: 'viewer', displayName: 'Can view', description: '' })
    const editorRole = mock<ShareRole>({ id: 'editor', displayName: 'Can edit', description: '' })
    const deniedRole = mock<ShareRole>({
      id: UNIFIED_ROLE_DENIED_ID,
      displayName: 'Cannot access',
      description: ''
    })

    it('is not offered in the role dropdown of a guest share', () => {
      const share = getShareMock({ shareType: ShareTypes.guest.value })
      share.role = viewerRole
      const { wrapper } = createWrapper({
        share,
        stubRoleDropdown: false,
        availableInternalShareRoles: [viewerRole, editorRole, deniedRole]
      })
      expect(wrapper.find(`#files-recipient-role-drop-btn-${viewerRole.id}`).exists()).toBeTruthy()
      expect(wrapper.find(`#files-recipient-role-drop-btn-${deniedRole.id}`).exists()).toBeFalsy()
    })
    it('is offered in the role dropdown of a user share', () => {
      const share = getShareMock({ shareType: ShareTypes.user.value })
      share.role = viewerRole
      const { wrapper } = createWrapper({
        share,
        stubRoleDropdown: false,
        availableInternalShareRoles: [viewerRole, editorRole, deniedRole]
      })
      expect(wrapper.find(`#files-recipient-role-drop-btn-${deniedRole.id}`).exists()).toBeTruthy()
    })
  })
})

function createWrapper({
  share = getShareMock(),
  modifiable = true,
  sharedParentRoute = null,
  resource = mock<Resource>(),
  stubRoleDropdown = true,
  availableInternalShareRoles = []
}: {
  share?: CollaboratorShare
  modifiable?: boolean
  sharedParentRoute?: RouteLocationNamedRaw
  resource?: Resource
  stubRoleDropdown?: boolean
  availableInternalShareRoles?: ShareRole[]
} = {}) {
  const mocks = defaultComponentMocks()
  mocks.$clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(undefined)

  return {
    mocks,
    wrapper: mount(ListItem, {
      props: {
        share,
        modifiable,
        sharedParentRoute
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: {
          ...mocks,
          resource,
          availableInternalShareRoles,
          availableExternalShareRoles: []
        },
        renderStubDefaultSlot: true,
        stubs: {
          ...defaultStubs,
          'oc-icon': true,
          'avatar-image': true,
          'router-link': true,
          'oc-info-drop': true,
          'oc-table-simple': true,
          'oc-tr': true,
          'oc-td': true,
          'oc-tag': true,
          'oc-pagination': true,
          'oc-avatar-item': true,
          'oc-drop': true,
          ...(stubRoleDropdown ? { 'role-dropdown': true } : {}),
          'edit-dropdown': true,
          'user-avatar': true,
          translate: false
        }
      }
    })
  }
}
