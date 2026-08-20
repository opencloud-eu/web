import { useDriveResolver } from '../../../../src/composables/driveResolver'
import { ref, unref } from 'vue'
import { mock, mockDeep } from 'vitest-mock-extended'
import { isShareSpaceResource, ShareSpaceResource, SpaceResource } from '@opencloud-eu/web-client'
import {
  getComposableWrapper,
  defaultComponentMocks,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { useSpacesStore } from '../../../../src/composables/piniaStores'

describe('useDriveResolver', () => {
  it('should be valid', () => {
    expect(useDriveResolver).toBeDefined()
  })
  it('space and item should be null when no driveAliasAndItem given', () => {
    const mocks = defaultComponentMocks()

    getComposableWrapper(
      () => {
        const { space, item } = useDriveResolver({ driveAliasAndItem: ref('') })
        expect(unref(space)).toEqual(null)
        expect(unref(item)).toEqual(null)
      },
      { mocks, provide: mocks }
    )
  })
  it('returns a public space on a public page', () => {
    const token = 'token'
    const spaceMock = mockDeep<SpaceResource>({ id: token })

    const mocks = defaultComponentMocks()

    getComposableWrapper(
      () => {
        const { space, item } = useDriveResolver({ driveAliasAndItem: ref(`public/${token}`) })
        expect(unref(space)).toEqual(spaceMock)
        expect(unref(item)).toEqual('/')
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { spacesState: { spaces: [spaceMock] } } }
      }
    )
  })
  it('returns a share space for a share', () => {
    const shareSpace = mockDeep<ShareSpaceResource>({ driveType: 'share' })

    const mocks = defaultComponentMocks()
    getComposableWrapper(
      () => {
        const spacesStore = useSpacesStore()
        vi.mocked(spacesStore.createShareSpace).mockReturnValue(shareSpace)
        const { space, item } = useDriveResolver({
          driveAliasAndItem: ref(`share/someSharedFolder`)
        })
        expect(isShareSpaceResource(unref(space))).toEqual(true)
        expect(unref(item)).toEqual('/')
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { spacesState: { spaces: [shareSpace] } } }
      }
    )
  })
  it('returns a space by fileId if given', () => {
    const fileId = 'someFileId'
    const resourcePath = '/someFolder'
    const spaceMock = mockDeep<SpaceResource>({ fileId, driveAlias: 'driveAlias' })
    const mocks = defaultComponentMocks({
      currentRoute: mock<RouteLocation>({
        name: 'files-spaces-generic',
        path: '/',
        query: { fileId }
      })
    })

    getComposableWrapper(
      () => {
        const { space, item, itemId } = useDriveResolver({
          driveAliasAndItem: ref(`/personal${resourcePath}`)
        })
        expect(unref(space)).toEqual(spaceMock)
        expect(unref(item)).toEqual(resourcePath)
        expect(unref(itemId)).toEqual(fileId)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { spacesState: { spaces: [spaceMock] } } }
      }
    )
  })
  it('returns the space the fileId points at when two spaces share a driveAlias', () => {
    const driveAlias = 'project/test'
    const first = mockDeep<SpaceResource>({ id: 'space-a', fileId: 'space-a', driveAlias })
    const second = mockDeep<SpaceResource>({ id: 'space-b', fileId: 'space-b', driveAlias })
    const mocks = defaultComponentMocks({
      currentRoute: mock<RouteLocation>({
        name: 'files-spaces-generic',
        path: '/',
        query: { fileId: 'space-b!someFolder' }
      })
    })

    getComposableWrapper(
      () => {
        const { space, item } = useDriveResolver({
          driveAliasAndItem: ref(`${driveAlias}/someFolder`)
        })
        expect(unref(space)).toEqual(second)
        expect(unref(item)).toEqual('/someFolder')
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { spacesState: { spaces: [first, second] } } }
      }
    )
  })
  it('returns a space by driveAlias if no fileId given', () => {
    const driveAlias = '/personal'
    const resourcePath = '/someFolder'
    const spaceMock = mockDeep<SpaceResource>({ driveAlias })
    const mocks = defaultComponentMocks({
      currentRoute: mock<RouteLocation>({
        name: 'files-spaces-generic',
        path: '/',
        query: { fileId: undefined }
      })
    })

    getComposableWrapper(
      () => {
        const { space, item } = useDriveResolver({
          driveAliasAndItem: ref(`${driveAlias}${resourcePath}`)
        })
        expect(unref(space)).toEqual(spaceMock)
        expect(unref(item)).toEqual(resourcePath)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { spacesState: { spaces: [spaceMock] } } }
      }
    )
  })
})
