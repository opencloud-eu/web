import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { buildPublicSpaceResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  getComposableWrapper,
  useGetMatchingSpaceMock
} from '@opencloud-eu/web-test-helpers'
import {
  ClipboardActions,
  ResourceTransfer,
  TransferType,
  useGetMatchingSpace,
  usePasteWorker
} from '@opencloud-eu/web-pkg'
import { useFileActionsPaste } from '../../../../../src/composables/actions/files'

const showResultMessage = vi.fn()

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  usePasteWorker: vi.fn(),
  useGetMatchingSpace: vi.fn(),
  ResourceTransfer: vi.fn()
}))

describe('paste', () => {
  it('reports a move for cut & paste although the clipboard is cleared before the worker finishes', async () => {
    await pasteWithTransferType(TransferType.MOVE)
    expect(showResultMessage).toHaveBeenCalledWith([], [], TransferType.MOVE)
  })
  it('reports a copy when a cut resource is copied into another space', async () => {
    await pasteWithTransferType(TransferType.COPY)
    expect(showResultMessage).toHaveBeenCalledWith([], [], TransferType.COPY)
  })
})

describe('isDisabled', () => {
  describe('public link', () => {
    const space = buildPublicSpaceResource({
      id: 'link-token',
      name: 'link',
      serverUrl: 'https://example.com',
      publicLinkType: 'public'
    })

    it('is enabled when the current folder allows creating', () => {
      const { actions } = getWrapper({ currentFolder: getCurrentFolder(true) })
      expect(unref(actions)[0].isDisabled({ space })).toBe(false)
      expect(unref(actions)[0].disabledTooltip({ space })).toBe('')
    })

    it('is disabled when the current folder does not allow creating', () => {
      const { actions } = getWrapper({ currentFolder: getCurrentFolder(false) })
      expect(unref(actions)[0].isDisabled({ space })).toBe(true)
      expect(unref(actions)[0].disabledTooltip({ space })).toBe(
        'You have no permission to paste files here.'
      )
    })
  })
})

function getCurrentFolder(canCreate: boolean) {
  return mock<Resource>({ id: 'cf-1', path: '/b', isInVault: false, canCreate: () => canCreate })
}

async function pasteWithTransferType(transferType: TransferType) {
  const space = mock<SpaceResource>({ id: 'space-1' })
  let workerCallback: (result: { successful: Resource[]; failed: unknown[] }) => void
  vi.mocked(usePasteWorker).mockReturnValue({
    startWorker: vi.fn((_, callback) => {
      workerCallback = callback
    })
  } as unknown as ReturnType<typeof usePasteWorker>)
  vi.mocked(useGetMatchingSpace).mockImplementation(() =>
    useGetMatchingSpaceMock({ getMatchingSpace: () => space })
  )
  vi.mocked(ResourceTransfer).mockImplementation(
    class {
      getTransferData = vi.fn().mockResolvedValue([{ transferType }])
      showResultMessage = showResultMessage
    } as unknown as typeof ResourceTransfer
  )

  const resource = mock<Resource>({ id: 'r1', storageId: 'space-1', path: '/a/file.txt' })
  const { actions } = getWrapper()
  await unref(actions)[0].handler({ space, resources: [resource] })

  workerCallback({ successful: [], failed: [] })
}

function getWrapper({
  currentFolder = mock<Resource>({ id: 'cf-1', path: '/b' })
}: { currentFolder?: Resource } = {}) {
  const mocks = defaultComponentMocks()
  let instance: ReturnType<typeof useFileActionsPaste>
  getComposableWrapper(
    () => {
      instance = useFileActionsPaste()
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          stubActions: false,
          clipboardState: {
            action: ClipboardActions.Cut,
            resources: [
              mock<Resource>({
                id: 'r1',
                storageId: 'space-1',
                path: '/a/file.txt',
                parentFolderId: 'a',
                isInVault: false
              })
            ]
          },
          resourcesStore: { currentFolder }
        }
      }
    }
  )
  return instance
}
