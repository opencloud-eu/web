import RoleDropdown from '../../../../../../src/components/SideBar/Shares/Collaborators/RoleDropdown.vue'
import { ShareRole, UNIFIED_ROLE_DENIED_ID } from '@opencloud-eu/web-client'
import { defaultPlugins, mount, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import { User } from '@opencloud-eu/web-client/graph/generated'

const selectors = {
  recipientRoleBtn: '.files-recipient-role-select-btn',
  roleButton: '.files-recipient-role-drop-btn',
  filesPermissionActionsList: '.files-permission-actions-list'
}

describe('RoleDropdown', () => {
  it('renders a button with invite text if no existing role given', () => {
    const { wrapper } = getWrapper({ mountType: shallowMount })
    expect(wrapper.find(selectors.recipientRoleBtn).exists()).toBeTruthy()
    expect(wrapper.find(`${selectors.recipientRoleBtn} span`).text()).toEqual('Can view')
  })
  it('renders a button with existing role if given', () => {
    const { wrapper } = getWrapper({
      mountType: shallowMount,
      existingShareRole: mock<ShareRole>({ displayName: 'Can edit' })
    })
    expect(wrapper.find(selectors.recipientRoleBtn).exists()).toBeTruthy()
    expect(wrapper.find(`${selectors.recipientRoleBtn} span`).text()).toEqual('Can edit')
    expect(wrapper.find(selectors.filesPermissionActionsList).exists()).toBeFalsy()
  })
  it('lists permission actions if a role is unknown', () => {
    const { wrapper } = getWrapper({
      mountType: shallowMount,
      existingSharePermissions: ['read', 'update']
    })
    expect(wrapper.find(selectors.recipientRoleBtn).exists()).toBeTruthy()
    expect(wrapper.find(selectors.filesPermissionActionsList).exists()).toBeTruthy()
  })
  it('does not render a button if only one role is available', () => {
    const { wrapper } = getWrapper({
      mountType: shallowMount,
      availableInternalShareRoles: [mock<ShareRole>({ displayName: 'Can view', description: '' })]
    })
    expect(wrapper.find(selectors.recipientRoleBtn).exists()).toBeFalsy()
  })
  it('emits "optionChange"-event on role click', async () => {
    const { wrapper } = getWrapper({ mountType: shallowMount })
    await wrapper.find(selectors.roleButton).trigger('click')
    expect(wrapper.emitted('optionChange')).toBeTruthy()
  })
  describe('when the existing share role changes', () => {
    const canView = mock<ShareRole>({ id: 'view', displayName: 'Can view', description: '' })
    const canEdit = mock<ShareRole>({ id: 'edit', displayName: 'Can edit', description: '' })

    it('shows and selects the new role', async () => {
      const { wrapper } = getWrapper({
        mountType: shallowMount,
        existingShareRole: canView,
        availableInternalShareRoles: [canView, canEdit]
      })

      await wrapper.setProps({ existingShareRole: canEdit })

      expect(wrapper.find(`${selectors.recipientRoleBtn} span`).text()).toEqual('Can edit')
      expect(wrapper.find(`#files-recipient-role-drop-btn-${canEdit.id}`).classes()).toContain(
        'selected'
      )
      expect(wrapper.find(`#files-recipient-role-drop-btn-${canView.id}`).classes()).not.toContain(
        'selected'
      )
    })
    it('keeps the role selected in this tab once the share got updated', async () => {
      const { wrapper } = getWrapper({
        mountType: shallowMount,
        existingShareRole: canView,
        availableInternalShareRoles: [canView, canEdit]
      })

      await wrapper.find(`#files-recipient-role-drop-btn-${canEdit.id}`).trigger('click')
      expect(wrapper.emitted('optionChange')).toEqual([[canEdit]])

      await wrapper.setProps({ existingShareRole: { ...canEdit } })

      expect(wrapper.find(`${selectors.recipientRoleBtn} span`).text()).toEqual('Can edit')
    })
  })
  describe('resetSelectedRole', () => {
    it('reverts to the existing share role', async () => {
      const canView = mock<ShareRole>({ id: 'view', displayName: 'Can view', description: '' })
      const canEdit = mock<ShareRole>({ id: 'edit', displayName: 'Can edit', description: '' })
      const { wrapper } = getWrapper({
        mountType: shallowMount,
        existingShareRole: canEdit,
        availableInternalShareRoles: [canView, canEdit]
      })
      await wrapper.find(`#files-recipient-role-drop-btn-${canView.id}`).trigger('click')
      expect(wrapper.find(`${selectors.recipientRoleBtn} span`).text()).toEqual('Can view')

      wrapper.vm.resetSelectedRole()
      await wrapper.vm.$nextTick()
      expect(wrapper.find(`${selectors.recipientRoleBtn} span`).text()).toEqual('Can edit')
    })
    it('reverts to "Custom permissions" if the share has permissions but no role', async () => {
      const canView = mock<ShareRole>({ id: 'view', displayName: 'Can view', description: '' })
      const { wrapper } = getWrapper({
        mountType: shallowMount,
        existingSharePermissions: ['read', 'update'],
        availableInternalShareRoles: [
          canView,
          mock<ShareRole>({ id: 'edit', displayName: 'Can edit', description: '' })
        ]
      })
      expect(wrapper.find(`${selectors.recipientRoleBtn} span`).text()).toEqual(
        'Custom permissions'
      )
      await wrapper.find(`#files-recipient-role-drop-btn-${canView.id}`).trigger('click')
      expect(wrapper.find(`${selectors.recipientRoleBtn} span`).text()).toEqual('Can view')

      wrapper.vm.resetSelectedRole()
      await wrapper.vm.$nextTick()
      expect(wrapper.find(`${selectors.recipientRoleBtn} span`).text()).toEqual(
        'Custom permissions'
      )
    })
  })
  it('renders a button for each available role', () => {
    const { wrapper } = getWrapper({ mountType: shallowMount })
    expect(wrapper.findAll(selectors.roleButton).length).toBe(2)
  })
  it('uses available external share roles if "isExternal" is given', () => {
    const externalShareRole2 = mock<ShareRole>({ id: 'external1', displayName: '' })
    const externalShareRole1 = mock<ShareRole>({ id: 'external2', displayName: '' })
    const { wrapper } = getWrapper({
      mountType: shallowMount,
      isExternal: true,
      availableExternalShareRoles: [externalShareRole1, externalShareRole2]
    })

    expect(
      wrapper.find(`oc-button-stub#files-recipient-role-drop-btn-${externalShareRole1.id}`).exists()
    ).toBeTruthy()
  })
  describe('deny role', () => {
    const viewerRole = mock<ShareRole>({ id: 'viewer', displayName: 'Can view', description: '' })
    const editorRole = mock<ShareRole>({ id: 'editor', displayName: 'Can edit', description: '' })
    const deniedRole = mock<ShareRole>({
      id: UNIFIED_ROLE_DENIED_ID,
      displayName: 'Cannot access',
      description: ''
    })

    it('is not offered for guests', () => {
      const { wrapper } = getWrapper({
        mountType: shallowMount,
        isGuest: true,
        availableInternalShareRoles: [viewerRole, editorRole, deniedRole]
      })
      expect(wrapper.find(`#files-recipient-role-drop-btn-${viewerRole.id}`).exists()).toBeTruthy()
      expect(wrapper.find(`#files-recipient-role-drop-btn-${deniedRole.id}`).exists()).toBeFalsy()
    })
    it('is offered for other recipients', () => {
      const { wrapper } = getWrapper({
        mountType: shallowMount,
        availableInternalShareRoles: [viewerRole, editorRole, deniedRole]
      })
      expect(wrapper.find(`#files-recipient-role-drop-btn-${deniedRole.id}`).exists()).toBeTruthy()
    })
  })
})

function getWrapper({
  mountType = mount,
  existingShareRole = null,
  existingSharePermissions = null,
  isExternal = false,
  isGuest = false,
  availableInternalShareRoles = [
    mock<ShareRole>({ displayName: 'Can view', description: '' }),
    mock<ShareRole>({ displayName: 'Can edit', description: '' })
  ],
  availableExternalShareRoles = []
}: {
  mountType?: typeof mount
  existingShareRole?: ShareRole
  existingSharePermissions?: string[]
  isExternal?: boolean
  isGuest?: boolean
  availableInternalShareRoles?: ShareRole[]
  availableExternalShareRoles?: ShareRole[]
} = {}) {
  return {
    wrapper: mountType(RoleDropdown, {
      props: {
        existingShareRole,
        existingSharePermissions: existingSharePermissions ?? [],
        isExternal,
        isGuest
      },
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: { userState: { user: { onPremisesSamAccountName: 'name' } as User } }
          })
        ],
        renderStubDefaultSlot: true,
        provide: {
          resource: mock<Resource>(),
          availableInternalShareRoles,
          availableExternalShareRoles
        }
      }
    })
  }
}
