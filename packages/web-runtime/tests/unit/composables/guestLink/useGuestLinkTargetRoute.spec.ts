import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { RouteLocationNamedRaw } from 'vue-router'
import { Resource, ShareSpaceResource } from '@opencloud-eu/web-client'
import { useLinkTargetRoute } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useGuestLinkTargetRoute } from '../../../../src/composables/guestLink'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useLinkTargetRoute: vi.fn()
}))

const space = mock<ShareSpaceResource>({
  id: 'share-id',
  driveType: 'share',
  driveAlias: 'share/shared.png'
})

describe('useGuestLinkTargetRoute', () => {
  it('resolves a shared folder into the file list of the share', async () => {
    const { getLinkTargetRoute, route } = await getRoute({
      resource: mock<Resource>({ isFolder: true })
    })

    expect(route).toEqual({
      name: 'files-guest-link',
      params: { driveAliasAndItem: 'share/shared.png' },
      query: { shareId: 'share-id', permissionId: 'permission-id' }
    })
    expect(getLinkTargetRoute).not.toHaveBeenCalled()
  })

  it('resolves a single file share via its link target route', async () => {
    const resource = mock<Resource>({ isFolder: false })
    const { getLinkTargetRoute, route } = await getRoute({ resource })

    expect(getLinkTargetRoute).toHaveBeenCalledWith({ space, resource, path: '/' })
    expect(route).toEqual({
      name: 'preview',
      query: { contextRouteName: 'files-guest-link', permissionId: 'permission-id' }
    })
  })

  it('resolves into the file list of the share with a user context', async () => {
    const { getLinkTargetRoute, route, mocks } = await getRoute({
      resource: mock<Resource>({ isFolder: false }),
      isGuestContext: false
    })

    expect(route).toEqual(expect.objectContaining({ name: 'files-guest-link' }))
    expect(mocks.$clientService.webdav.getFileInfo).not.toHaveBeenCalled()
    expect(getLinkTargetRoute).not.toHaveBeenCalled()
  })

  it('falls back to the file list of the share if the share root can not be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { getLinkTargetRoute, route } = await getRoute({ error: new Error('network') })

    expect(route).toEqual(expect.objectContaining({ name: 'files-guest-link' }))
    expect(getLinkTargetRoute).not.toHaveBeenCalled()
  })
})

async function getRoute({
  resource,
  error,
  isGuestContext = true
}: {
  resource?: Resource
  error?: Error
  isGuestContext?: boolean
}) {
  const getLinkTargetRoute = vi.fn().mockReturnValue({
    name: 'preview',
    query: { contextRouteName: 'files-guest-link' }
  })
  vi.mocked(useLinkTargetRoute).mockReturnValue({ getLinkTargetRoute })

  const mocks = defaultComponentMocks()
  if (error) {
    mocks.$clientService.webdav.getFileInfo.mockRejectedValue(error)
  } else {
    mocks.$clientService.webdav.getFileInfo.mockResolvedValue(resource)
  }

  let route: RouteLocationNamedRaw
  getComposableWrapper(
    async () => {
      const { getGuestLinkTargetRoute } = useGuestLinkTargetRoute()
      route = await getGuestLinkTargetRoute({ permissionId: 'permission-id', space })
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          authState: { guestContextReady: true, userContextReady: !isGuestContext }
        }
      }
    }
  )
  await flushPromises()

  return { getLinkTargetRoute, route, mocks }
}
