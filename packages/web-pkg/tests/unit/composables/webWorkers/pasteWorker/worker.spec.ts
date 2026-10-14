import { unref } from 'vue'
import { useWebWorker } from '@vueuse/core'
import PasteWorker from '../../../../../src/composables/webWorkers/pasteWorker/worker?worker'
import { TransferType } from '../../../../../src/helpers/resource/conflictHandling'
import { mock } from 'vitest-mock-extended'
import type { WebDAV } from '@opencloud-eu/web-client/webdav'

const resourceMock = {
  id: 'resourceId',
  name: 'resourceName'
}

const targetSpaceMock = {
  id: 'targetSpaceId'
}

const sourceSpaceMock = {
  id: 'sourceSpaceId'
}

const targetFolderMock = {
  id: 'targetFolderId',
  path: '/',
  webDavPath: '/'
}

const transferDataMock = {
  resource: resourceMock,
  sourceSpace: sourceSpaceMock,
  targetSpace: targetSpaceMock,
  targetFolder: targetFolderMock,
  path: '',
  baseUrl: 'https://example.com'
}

describe('paste worker', () => {
  let worker: ReturnType<typeof useWebWorker>
  let webDavMock: ReturnType<typeof mock<WebDAV>>
  let webdavFactory: ReturnType<typeof vi.fn>

  let resolveTest: (value: boolean) => unknown
  let workerPromise: Promise<unknown>

  beforeEach(() => {
    worker = useWebWorker(PasteWorker as unknown as string, { type: 'module' })
    webDavMock = mock<WebDAV>()

    workerPromise = new Promise((resolve) => {
      resolveTest = resolve
    })

    webdavFactory = vi.fn(() => webDavMock)
    vi.doMock('@opencloud-eu/web-client', async (importOriginal) => ({
      ...(await importOriginal<any>()),
      webdav: webdavFactory
    }))
  })

  afterEach(() => {
    worker.terminate()

    workerPromise = undefined
    resolveTest = undefined
    webDavMock = undefined
  })

  it('calls webdav copy operation for copy actions', async () => {
    webDavMock.copyFiles.mockResolvedValue(undefined)

    unref(worker.worker).onmessage = (e: MessageEvent) => {
      const { successful } = JSON.parse(e.data)
      expect(successful.length).toBe(1)
      expect(webDavMock.copyFiles).toHaveBeenCalledTimes(1)

      resolveTest(true)
    }

    worker.post(
      JSON.stringify({
        topic: 'startProcess',
        data: {
          transferData: [{ ...transferDataMock, transferType: TransferType.COPY }]
        }
      })
    )

    await workerPromise
  })

  it('calls webdav move operation for move actions', async () => {
    webDavMock.moveFiles.mockResolvedValue(undefined)

    unref(worker.worker).onmessage = (e: MessageEvent) => {
      const { successful } = JSON.parse(e.data)
      expect(successful.length).toBe(1)
      expect(webDavMock.moveFiles).toHaveBeenCalledTimes(1)

      resolveTest(true)
    }

    worker.post(
      JSON.stringify({
        topic: 'startProcess',
        data: {
          transferData: [{ ...transferDataMock, transferType: TransferType.MOVE }]
        }
      })
    )

    await workerPromise
  })

  it('returns failed files', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    webDavMock.copyFiles.mockRejectedValue({ response: {} })

    unref(worker.worker).onmessage = (e: MessageEvent) => {
      const { failed } = JSON.parse(e.data)
      expect(failed.length).toBe(1)

      resolveTest(true)
    }

    worker.post(
      JSON.stringify({
        topic: 'startProcess',
        data: {
          transferData: [{ ...transferDataMock, transferType: TransferType.COPY }]
        }
      })
    )

    await workerPromise
  })

  it.each([true, false])(
    'passes withCredentials %s to the webdav client',
    async (withCredentials) => {
      webDavMock.copyFiles.mockResolvedValue(undefined)

      unref(worker.worker).onmessage = () => {
        resolveTest(true)
      }

      worker.post(
        JSON.stringify({
          topic: 'startProcess',
          data: {
            transferData: [{ ...transferDataMock, transferType: TransferType.COPY }],
            withCredentials
          }
        })
      )

      await workerPromise

      const [, , getWithCredentials] = webdavFactory.mock.calls[0]
      expect(getWithCredentials()).toBe(withCredentials)
    }
  )
})
