import ListItem from '../../../../../../src/components/SideBar/Shares/Links/ListItem.vue'
import { LinkShare, ShareRole, Resource } from '@opencloud-eu/web-client'
import { defaultPlugins, shallowMount, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { useLinkTypes, LinkRoleDropdown, useModals } from '@opencloud-eu/web-pkg'
import { SharingLinkType } from '@opencloud-eu/web-client/graph/generated'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useLinkTypes: vi.fn()
}))

const exampleLink = {
  displayName: 'Example link',
  webUrl: 'https://some-url.com/abc',
  type: SharingLinkType.View
} as LinkShare

describe('ListItem component', () => {
  describe('role dropdown', () => {
    it('gets rendered when the user is able to modify the public link', () => {
      const linkShare = mock<LinkShare>({ type: 'edit' })
      const availableLinkTypes = [SharingLinkType.View, SharingLinkType.Edit]
      const { wrapper } = getWrapper({ linkShare, availableLinkTypes })
      const drop = wrapper.findComponent<typeof LinkRoleDropdown>('link-role-dropdown-stub')

      expect(drop.props('modelValue')).toEqual(linkShare.type)
      expect(drop.props('availableLinkTypeOptions')).toEqual(availableLinkTypes)
    })
    it('does not get rendered if the user is not able to modify the public link', () => {
      const { wrapper } = getWrapper({ isModifiable: false })

      expect(wrapper.find('.link-current-role').exists()).toBeTruthy()
    })
    it('keeps the current type when the password dialog for a new type gets cancelled', async () => {
      const linkShare = mock<LinkShare>({ type: SharingLinkType.View, hasPassword: false })
      const { wrapper } = getWrapper({ linkShare, isPasswordEnforced: true })
      const drop = wrapper.findComponent<typeof LinkRoleDropdown>('link-role-dropdown-stub')

      drop.vm.$emit('update:modelValue', SharingLinkType.Edit)
      await wrapper.vm.$nextTick()

      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalled()
      expect(wrapper.emitted('updateLink')).toBeUndefined()
      expect(drop.props('modelValue')).toEqual(SharingLinkType.View)
    })
  })
  describe('additional information icons', () => {
    it('renders an icon if the link has a password', () => {
      const linkShare = mock<LinkShare>({ hasPassword: true })
      const { wrapper } = getWrapper({ linkShare })
      expect(wrapper.find('.oc-files-file-link-has-password').exists()).toBeTruthy()
    })
    it('renders an icon if the link has an expiration date', () => {
      const linkShare = mock<LinkShare>({ expirationDateTime: 'Wed Apr 01 2020' })
      const { wrapper } = getWrapper({ linkShare })
      expect(wrapper.find('expiration-date-indicator-stub').exists()).toBeTruthy()
    })
  })
  it('renders the edit dropdown component', () => {
    const linkShare = mock<LinkShare>({ type: 'edit' })
    const { wrapper } = getWrapper({ linkShare })

    expect(wrapper.find('edit-dropdown-stub').exists()).toBeTruthy()
  })
})

function getWrapper({
  linkShare = exampleLink,
  isModifiable = true,
  availableLinkTypes = [SharingLinkType.View],
  isPasswordEnforced = false
}: {
  linkShare?: LinkShare
  isModifiable?: boolean
  availableLinkTypes?: SharingLinkType[]
  isPasswordEnforced?: boolean
} = {}) {
  vi.mocked(useLinkTypes).mockReturnValue(
    mock<ReturnType<typeof useLinkTypes>>({
      getAvailableLinkTypes: () => availableLinkTypes,
      getLinkRoleByType: () => mock<ShareRole>({ displayName: '', description: '' }),
      isPasswordEnforcedForLinkType: () => isPasswordEnforced
    })
  )

  const mocks = defaultComponentMocks()
  return {
    wrapper: shallowMount(ListItem, {
      props: {
        canRename: true,
        linkShare,
        isModifiable
      },
      global: {
        mocks,
        plugins: defaultPlugins(),
        provide: { ...mocks, resource: mock<Resource>() }
      }
    })
  }
}
