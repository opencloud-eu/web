import ListItem from '../../../../../../src/components/SideBar/Shares/Links/ListItem.vue'
import { LinkShare, ShareRole, Resource } from '@opencloud-eu/web-client'
import { defaultPlugins, shallowMount, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import {
  formatDateFromDateTime,
  useLinkTypes,
  LinkRoleDropdown,
  useModals
} from '@opencloud-eu/web-pkg'
import { ContextualHelperDataListItem } from '@opencloud-eu/design-system/helpers'
import { DateTime } from 'luxon'
import EditDropdown from '../../../../../../src/components/SideBar/Shares/Links/EditDropdown.vue'
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
    it('focuses the password input of the password dialog initially', async () => {
      const linkShare = mock<LinkShare>({ type: SharingLinkType.View, hasPassword: false })
      const { wrapper } = getWrapper({ linkShare, isPasswordEnforced: true })
      const drop = wrapper.findComponent<typeof LinkRoleDropdown>('link-role-dropdown-stub')

      drop.vm.$emit('update:modelValue', SharingLinkType.Edit)
      await wrapper.vm.$nextTick()

      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalledWith(
        expect.objectContaining({ focusTrapInitial: '#set-link-password-input' })
      )
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
  describe('details', () => {
    const createdDateTime = '2026-09-08T11:34:00Z'
    const expirationDateTime = '2026-12-01T23:59:59Z'

    function getDetails(linkShare: LinkShare) {
      const { wrapper } = getWrapper({ linkShare })
      return wrapper.findComponent<typeof EditDropdown>('edit-dropdown-stub').props('details')
    }

    function getRow(details: ContextualHelperDataListItem[], headline: string) {
      const index = details.findIndex((item) => item.headline && item.text === headline)
      if (index === -1) {
        return undefined
      }
      return details[index + 1].text
    }

    it('shows all details of a link', () => {
      const details = getDetails({
        ...exampleLink,
        hasPassword: true,
        createdDateTime,
        expirationDateTime,
        sharedBy: { id: 'admin', displayName: 'Admin' }
      })

      expect(details).toEqual([
        { text: 'Link name', headline: true },
        { text: 'Example link' },
        { text: 'Type', headline: true },
        { text: 'Public, everyone with the link can access.' },
        { text: 'Needs password', headline: true },
        { text: 'yes' },
        { text: 'Access expires', headline: true },
        {
          text: formatDateFromDateTime(DateTime.fromISO(expirationDateTime), 'en')
        },
        { text: 'Created on', headline: true },
        { text: formatDateFromDateTime(DateTime.fromISO(createdDateTime), 'en') },
        { text: 'Created by', headline: true },
        { text: 'Admin' }
      ])
    })
    it('falls back to "Unnamed link" when the link has no name', () => {
      const details = getDetails({ ...exampleLink, displayName: '' })
      expect(getRow(details, 'Link name')).toBe('Unnamed link')
    })
    it('shows "no" for a link without password and expiration date', () => {
      const details = getDetails({
        ...exampleLink,
        hasPassword: false,
        expirationDateTime: undefined
      })
      expect(getRow(details, 'Needs password')).toBe('no')
      expect(getRow(details, 'Access expires')).toBe('no')
    })
    it('omits the creator when the server does not send it', () => {
      const details = getDetails({
        ...exampleLink,
        sharedBy: { id: undefined, displayName: undefined }
      })
      expect(getRow(details, 'Created by')).toBeUndefined()
    })
    it('omits the type for internal links', () => {
      const details = getDetails({ ...exampleLink, type: SharingLinkType.Internal })
      expect(getRow(details, 'Type')).toBeUndefined()
    })
    it('shows the public type for links that block downloads', () => {
      const details = getDetails({ ...exampleLink, type: SharingLinkType.BlocksDownload })
      expect(getRow(details, 'Type')).toBe('Public, everyone with the link can access.')
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
