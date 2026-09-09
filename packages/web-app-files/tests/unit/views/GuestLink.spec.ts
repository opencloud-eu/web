import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { useRouteParam } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import GuestLink from '../../../src/views/GuestLink.vue'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteParam: vi.fn()
}))

const selectors = {
  title: '[data-testid="guest-link-title"]',
  description: '[data-testid="guest-link-description"]'
}

describe('GuestLink view', () => {
  it('congratulates the guest on the authenticated share', () => {
    const { wrapper } = getWrapper()

    expect(wrapper.find(selectors.title).text()).toEqual('Guest link authenticated')
    expect(wrapper.find(selectors.description).text()).toContain('Invited folder')
  })

  it('shows the expired state without a guest context', () => {
    const { wrapper } = getWrapper({ guestContextReady: false })

    expect(wrapper.find(selectors.title).text()).toEqual('Guest link expired')
    expect(wrapper.find(selectors.description).text()).not.toContain('Invited folder')
  })

  it('shows the expired state for an unknown drive', () => {
    const { wrapper } = getWrapper({ driveAlias: 'share/Something else' })

    expect(wrapper.find(selectors.title).text()).toEqual('Guest link expired')
  })
})

function getWrapper({
  guestContextReady = true,
  driveAlias = 'share/Invited folder'
}: { guestContextReady?: boolean; driveAlias?: string } = {}) {
  vi.mocked(useRouteParam).mockReturnValue(ref(driveAlias))

  const space = mock<SpaceResource>({
    id: 'share-id',
    name: 'Invited folder',
    driveAlias: 'share/Invited folder'
  })
  const mocks = defaultComponentMocks()

  return {
    wrapper: mount(GuestLink, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              authState: { guestContextReady, guestPermissionId: 'permission-id' },
              spacesState: { spaces: [space] }
            }
          })
        ],
        mocks,
        provide: mocks
      }
    })
  }
}
