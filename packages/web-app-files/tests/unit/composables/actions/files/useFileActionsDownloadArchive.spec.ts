import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { ArchiverService, useArchiverService } from '@opencloud-eu/web-pkg'
import { useFileActionsDownloadArchive } from '../../../../../src/composables/actions/files'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useArchiverService: vi.fn()
}))

describe('downloadArchive', () => {
  describe('search context', () => {
    describe('computed property "actions"', () => {
      describe('handler', () => {
        it.each([
          {
            resources: [
              { id: '1', fileId: '1', canDownload: () => true },
              { id: '2', fileId: '2', canDownload: () => true }
            ] as Resource[],
            downloadableResourceIds: ['1', '2']
          },
          {
            resources: [
              { id: '1', fileId: '1', canDownload: () => true },
              { id: '2', fileId: '2', canDownload: () => true },
              { id: '3', fileId: '3', canDownload: () => true },
              { id: '4', fileId: '4', canDownload: () => false },
              { id: '5', fileId: '5', canDownload: () => true, driveType: 'project' }
            ] as Resource[],
            downloadableResourceIds: ['1', '2', '3']
          }
        ])('should filter non downloadable resources', ({ resources, downloadableResourceIds }) => {
          const triggerDownloadMock = vi.fn().mockResolvedValue(true)
          getWrapper({
            searchLocation: true,
            triggerDownloadMock,
            setup: () => {
              const { actions } = useFileActionsDownloadArchive()

              unref(actions)[0].handler({ space: null, resources })

              expect(triggerDownloadMock).toHaveBeenCalledWith({ fileIds: downloadableResourceIds })
            }
          })
        })
      })
    })
  })
})

function getWrapper({
  searchLocation = false,
  triggerDownloadMock = vi.fn(),
  setup = () => undefined
}: {
  searchLocation?: boolean
  triggerDownloadMock?: (...args: unknown[]) => unknown
  setup?: () => unknown
} = {}) {
  const routeName = searchLocation ? 'files-common-search' : 'files-spaces-generic'

  vi.mocked(useArchiverService).mockImplementation(() => {
    return {
      triggerDownload: triggerDownloadMock
    } as ArchiverService
  })

  const mocks = {
    ...defaultComponentMocks({ currentRoute: mock<RouteLocation>({ name: routeName }) }),
    space: {
      driveType: 'personal'
    } as unknown as SpaceResource
  }

  return {
    wrapper: getComposableWrapper(setup, {
      mocks,
      provide: mocks
    })
  }
}
