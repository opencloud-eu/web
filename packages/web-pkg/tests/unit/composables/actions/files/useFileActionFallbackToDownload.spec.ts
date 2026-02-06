import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import {
  useFileActionFallbackToDownload,
  useModals,
  useDownloadFile
} from '../../../../../src/composables'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'

vi.mock('../../../../../src/composables/download/useDownloadFile')

describe('fallbackToDownload', () => {
  describe('computed property "actions"', () => {
    describe('method "handler"', () => {
      it('creates a modal with download confirmation', () => {
        getWrapper({
          setup: ({ actions }) => {
            const resource = mock<Resource>({
              name: 'test-file.png',
              isFolder: false,
              canDownload: () => true
            })

            const { dispatchModal } = useModals()

            unref(actions)[0].handler({
              resources: [resource],
              space: mock<SpaceResource>()
            })

            expect(dispatchModal).toHaveBeenCalled()
          }
        })
      })

      it('calls downloadFile when modal is confirmed', () => {
        getWrapper({
          setup: ({ actions }) => {
            const resource = mock<Resource>({
              name: 'test-file.png',
              isFolder: false,
              canDownload: () => true
            })

            const { dispatchModal } = useModals()

            unref(actions)[0].handler({
              resources: [resource],
              space: mock<SpaceResource>()
            })

            const modalCall = vi.mocked(dispatchModal).mock.calls[0][0]
            modalCall.onConfirm(null)

            const downloadFileComposable = useDownloadFile()
            expect(downloadFileComposable.downloadFile).toHaveBeenCalled()
          }
        })
      })
    })
  })
})

function getWrapper({
  setup,
  downloadFileMock = vi.fn()
}: {
  setup: (instance: ReturnType<typeof useFileActionFallbackToDownload>) => void
  downloadFileMock?: (...args: unknown[]) => unknown
}) {
  vi.mocked(useDownloadFile).mockReturnValue({
    downloadFile: downloadFileMock
  } as ReturnType<typeof useDownloadFile>)

  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    })
  }

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionFallbackToDownload()
        setup(instance)
      },
      {
        mocks,
        provide: mocks
      }
    )
  }
}
