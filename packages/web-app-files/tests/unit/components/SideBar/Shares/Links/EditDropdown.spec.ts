import EditDropdown from '../../../../../../src/components/SideBar/Shares/Links/EditDropdown.vue'
import { LinkShare, ShareTypes, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultPlugins,
  shallowMount,
  defaultComponentMocks,
  useGetMatchingSpaceMock
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import {
  AncestorMetaDataValue,
  useGetMatchingSpace,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { SharingLinkType } from '@opencloud-eu/web-client/graph/generated'
import { Resource } from '@opencloud-eu/web-client'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useGetMatchingSpace: vi.fn()
}))

const exampleLink = {
  displayName: 'Example link',
  webUrl: 'https://some-url.com/abc',
  type: SharingLinkType.View
} as LinkShare

describe('EditDropdown component', () => {
  describe('dropdown button', () => {
    it('does not get rendered if user cannot edit', () => {
      const { wrapper } = getWrapper({ isModifiable: false })
      expect(wrapper.find('.edit-drop-trigger').exists()).toBeFalsy()
    })
    it('does get rendered if user can edit', () => {
      const { wrapper } = getWrapper({ isModifiable: true })
      expect(wrapper.find('.edit-drop-trigger').exists()).toBeTruthy()
    })
    it('does get rendered if user cannot edit but link has shared ancestor', () => {
      const linkShare = mock<LinkShare>({ indirect: true, resourceId: 'ancestorId' })
      const sharedAncestor = mock<AncestorMetaDataValue>({
        id: 'ancestorId',
        shareTypes: [ShareTypes.link.value],
        path: '/parent'
      })
      const { wrapper } = getWrapper({ linkShare, isModifiable: false, sharedAncestor })

      expect(wrapper.find('.edit-drop-trigger').exists()).toBeTruthy()
      expect(
        wrapper.find('.edit-public-link-dropdown-menu-navigate-to-parent').exists()
      ).toBeTruthy()
    })
  })

  describe('editOptions computed property', () => {
    describe('expiration date', () => {
      it('does contain "add-expiration" option', () => {
        const { wrapper } = getWrapper()
        expect(wrapper.vm.editOptions.some((option) => option.id === 'add-expiration')).toBeTruthy()
      })
    })
    describe('rename', () => {
      it('does not contain "rename" option if user cannot rename the link', () => {
        const { wrapper } = getWrapper({ canRename: false })
        expect(wrapper.vm.editOptions.some((option) => option.id === 'rename')).toBeFalsy()
      })
      it('contains "rename" option if user can rename the link', () => {
        const { wrapper } = getWrapper({ canRename: true })
        expect(wrapper.vm.editOptions.some((option) => option.id === 'rename')).toBeTruthy()
      })
    })
  })

  describe('delete action', () => {
    it('does not get rendered when the user cannot modify the link', () => {
      const { wrapper } = getWrapper({ isModifiable: false })
      expect(wrapper.find('.edit-public-link-dropdown-menu-delete').exists()).toBeFalsy()
    })
    it('gets rendered when the user can modify the link', () => {
      const { wrapper } = getWrapper({ isModifiable: true })
      expect(wrapper.find('.edit-public-link-dropdown-menu-delete').exists()).toBeTruthy()
    })
  })
})

function getWrapper({
  linkShare = exampleLink,
  isModifiable = true,
  canRename = true,
  sharedAncestor
}: {
  linkShare?: LinkShare
  isModifiable?: boolean
  canRename?: boolean
  sharedAncestor?: AncestorMetaDataValue
} = {}) {
  vi.mocked(useGetMatchingSpace).mockImplementation(() =>
    useGetMatchingSpaceMock({
      getInternalSpace: () => mock<SpaceResource>()
    })
  )

  const plugins = defaultPlugins()

  const resourcesStore = useResourcesStore()
  vi.mocked(resourcesStore).getAncestorById.mockReturnValue(sharedAncestor)

  const mocks = defaultComponentMocks()
  return {
    wrapper: shallowMount(EditDropdown, {
      props: {
        canRename,
        linkShare,
        isModifiable
      },
      global: {
        mocks,
        renderStubDefaultSlot: true,
        plugins,
        provide: { ...mocks, resource: mock<Resource>() }
      }
    })
  }
}
