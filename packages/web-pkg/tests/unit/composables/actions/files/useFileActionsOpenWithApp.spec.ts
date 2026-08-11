import { mock } from 'vitest-mock-extended'
import { computed, unref } from 'vue'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import {
  useFileActionsOpenWithApp,
  useIsFilesAppActive,
  useModals
} from '../../../../../src/composables'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ApplicationFileExtension, ApplicationInformation } from '../../../../../src'
import { LocationQuery } from 'vue-router'

window.open = vi.fn()
vi.mock('../../../../../src/composables/actions/helpers/useIsFilesAppActive')

const spaceMock = mock<SpaceResource>({
  id: '1',
  getDriveAliasAndItem: () => 'personal/admin/test.txt'
})
describe('openWithApp', () => {
  describe('computed property "actions"', () => {
    describe('method "isVisible"', () => {
      it.each([
        {
          isFilesAppActive: false,
          expectedStatus: true
        },
        {
          isFilesAppActive: true,
          expectedStatus: false
        }
      ])('should be set correctly', ({ isFilesAppActive, expectedStatus }) => {
        getWrapper({
          isFilesAppActive,
          setup: ({ actions }) => {
            expect(unref(actions)[0].isVisible()).toBe(expectedStatus)
          }
        })
      })
    })
    describe('method "handler"', () => {
      it('creates a modal', () => {
        getWrapper({
          setup: async ({ actions }) => {
            const { dispatchModal } = useModals()
            await unref(actions)[0].handler({
              resources: [mock<Resource>({ storageId: spaceMock.id, path: '/' })],
              space: mock<SpaceResource>()
            })
            expect(dispatchModal).toHaveBeenCalled()
          }
        })
      })
    })
    describe('method "onFilePicked"', () => {
      it('opens resource in new window', () => {
        getWrapper({
          setup: ({ onFilePicked }) => {
            onFilePicked({
              resource: mock<Resource>({ storageId: spaceMock.id, path: '/' }),
              locationQuery: mock<LocationQuery>()
            })
            expect(window.open).toHaveBeenCalled()
          }
        })
      })

      it('encodes hash character in file path without double encoding', () => {
        const mockSpace = mock<SpaceResource>({
          id: '1',
          // getDriveAliasAndItem returns unencoded path (like the real implementation)
          getDriveAliasAndItem: () => 'personal/admin/ticket#1234.txt'
        })

        getWrapper({
          spaceMock: mockSpace,
          setup: ({ onFilePicked }) => {
            vi.mocked(window.open).mockClear()

            onFilePicked({
              resource: mock<Resource>({
                storageId: mockSpace.id,
                path: '/ticket#1234.txt',
                fileId: 'file-123'
              }),
              locationQuery: { foo: 'bar' }
            })

            const calls = vi.mocked(window.open).mock.calls
            expect(calls).toHaveLength(1)
            const url = calls[0][0] as string

            // Extract pathname from URL (before the query string)
            const pathname = url.split('?')[0]

            // Check that hash in pathname is encoded exactly once
            expect(pathname).toContain('ticket%231234.txt')
            // Ensure the pathname doesn't have double encoded hash
            expect(pathname).not.toContain('ticket%2523')
          }
        })
      })
    })
  })
})

function getWrapper({
  setup,
  isFilesAppActive = false,
  spaceMock: customSpaceMock
}: {
  setup: (instance: ReturnType<typeof useFileActionsOpenWithApp>) => void
  isFilesAppActive?: boolean
  spaceMock?: SpaceResource
}) {
  vi.mocked(useIsFilesAppActive).mockReturnValueOnce(computed(() => isFilesAppActive))

  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'text-editor' })
    })
  }

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsOpenWithApp({ appId: 'text-editor' })
        setup(instance)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: {
          piniaOptions: {
            spacesState: { spaces: [customSpaceMock || spaceMock] },
            appsState: {
              apps: {
                'text-editor': mock<ApplicationInformation>({
                  name: 'text-editor',
                  extensions: [mock<ApplicationFileExtension>({ extension: 'txt' })]
                })
              }
            }
          }
        }
      }
    )
  }
}
