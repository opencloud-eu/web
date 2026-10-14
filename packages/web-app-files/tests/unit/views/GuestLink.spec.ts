import { mock } from 'vitest-mock-extended'
import { SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import GuestLink from '../../../src/views/GuestLink.vue'

const selectors = {
  title: '[data-testid="guest-link-title"]',
  description: '[data-testid="guest-link-description"]'
}

describe('GuestLink view', () => {
  it('shows the share of the guest context', () => {
    const { wrapper } = getWrapper()

    expect(wrapper.find(selectors.title).text()).toEqual('Guest link authenticated')
    expect(wrapper.find(selectors.description).text()).toContain('Invited folder')
  })

  it('picks the share by id, not by name', () => {
    const { wrapper } = getWrapper({ guestSpaceId: 'other-share-id' })

    expect(wrapper.find(selectors.description).text()).toContain('Other folder')
  })

  it('shows the expired state without a guest context', () => {
    const { wrapper } = getWrapper({ guestContextReady: false })

    expect(wrapper.find(selectors.title).text()).toEqual('Guest link expired')
    expect(wrapper.find(selectors.description).text()).not.toContain('Invited folder')
  })

  it('shows the expired state for an unknown share', () => {
    const { wrapper } = getWrapper({ guestSpaceId: 'unknown-share-id' })

    expect(wrapper.find(selectors.title).text()).toEqual('Guest link expired')
  })

  it('shows a temporary error when the guest context could not be restored', () => {
    const { wrapper } = getWrapper({ guestContextReady: false, guestContextUnavailable: true })

    expect(wrapper.find(selectors.title).text()).toEqual('Guest link could not be opened')
    expect(wrapper.find(selectors.description).text()).toContain('try again later')
  })
})

function getWrapper({
  guestContextReady = true,
  guestContextUnavailable = false,
  guestSpaceId = 'share-id'
}: {
  guestContextReady?: boolean
  guestContextUnavailable?: boolean
  guestSpaceId?: string
} = {}) {
  const spaces = [
    mock<SpaceResource>({ id: 'share-id', name: 'Invited folder', driveType: 'share' }),
    mock<SpaceResource>({ id: 'other-share-id', name: 'Other folder', driveType: 'share' })
  ]
  const mocks = defaultComponentMocks()

  return {
    wrapper: mount(GuestLink, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              authState: {
                guestContextReady,
                guestContextUnavailable,
                guestPermissionId: 'permission-id',
                guestSpaceId
              },
              spacesState: { spaces }
            }
          })
        ],
        mocks,
        provide: mocks
      }
    })
  }
}
