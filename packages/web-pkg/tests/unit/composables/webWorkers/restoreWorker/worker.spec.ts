import { unref } from 'vue'
import { useWebWorker } from '@vueuse/core'
import RestoreWorker from '../../../../../src/composables/webWorkers/restoreWorker/worker?worker'
import { mock } from 'vitest-mock-extended'
import type { WebDAV } from '@opencloud-eu/web-client/webdav'
// loaded upfront, otherwise the worker's first import of it counts against the test timeout
import '@opencloud-eu/web-client'

const resourceMock = {
  id: 'resourceId',
  name: 'resourceName',
  path: '/folder/someFile.txt'
}

const spaceMock = {
  id: 'sourceSpaceId'
}

const dataMock = {
  resources: [resourceMock],
  space: spaceMock,
  missingFolderPaths: [] as string[],
  baseUrl: 'https://example.com'
}

describe('delete worker', () => {
  let worker: ReturnType<typeof useWebWorker>
  let webDavMock: ReturnType<typeof mock<WebDAV>>
  let webdavFactory: ReturnType<typeof vi.fn>

  let resolveTest: (value: boolean) => unknown
  let workerPromise: Promise<unknown>

  beforeEach(() => {
    worker = useWebWorker(RestoreWorker as unknown as string, { type: 'module' })
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

  it('calls webdav restoreFile operation and returns successful files', async () => {
    webDavMock.restoreFile.mockResolvedValue({ status: 200, result: undefined, body: undefined })

    unref(worker.worker).onmessage = (e: MessageEvent) => {
      const { successful } = JSON.parse(e.data)
      expect(successful.length).toBe(1)
      expect(webDavMock.restoreFile).toHaveBeenCalledTimes(1)

      resolveTest(true)
    }

    worker.post(
      JSON.stringify({
        topic: 'startProcess',
        data: dataMock
      })
    )

    await workerPromise
  })

  it('creates missing folders', async () => {
    webDavMock.createFolder.mockResolvedValue(undefined)
    webDavMock.restoreFile.mockResolvedValue({ status: 200, result: undefined, body: undefined })

    unref(worker.worker).onmessage = () => {
      expect(webDavMock.createFolder).toHaveBeenCalledTimes(1)

      resolveTest(true)
    }

    worker.post(
      JSON.stringify({
        topic: 'startProcess',
        data: { ...dataMock, missingFolderPaths: '/folder' }
      })
    )

    await workerPromise
  })

  it('restores parent folders before their children', async () => {
    const calls: string[] = []
    webDavMock.restoreFile.mockImplementation(async (_, { id }) => {
      calls.push(`start ${id}`)
      await new Promise((resolve) => setTimeout(resolve, 10))
      calls.push(`end ${id}`)
      return { status: 200, result: undefined, body: undefined }
    })

    unref(worker.worker).onmessage = () => {
      expect(calls).toEqual([
        'start folderId',
        'end folderId',
        'start resourceId',
        'end resourceId'
      ])

      resolveTest(true)
    }

    worker.post(
      JSON.stringify({
        topic: 'startProcess',
        data: {
          ...dataMock,
          resources: [resourceMock, { id: 'folderId', name: 'folder', path: '/folder' }]
        }
      })
    )

    await workerPromise
  })

  it.each([
    { overwriteIds: ['resourceId'], overwrite: true },
    { overwriteIds: [], overwrite: false }
  ])(
    'restores with overwrite $overwrite for overwriteIds $overwriteIds',
    async ({ overwriteIds, overwrite }) => {
      webDavMock.restoreFile.mockResolvedValue({ status: 200, result: undefined, body: undefined })

      unref(worker.worker).onmessage = () => {
        expect(webDavMock.restoreFile).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ id: 'resourceId' }),
          expect.anything(),
          { overwrite }
        )

        resolveTest(true)
      }

      worker.post(JSON.stringify({ topic: 'startProcess', data: { ...dataMock, overwriteIds } }))

      await workerPromise
    }
  )

  it('returns failed files', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    webDavMock.restoreFile.mockRejectedValue({ response: {} })

    unref(worker.worker).onmessage = (e: MessageEvent) => {
      const { failed } = JSON.parse(e.data)
      expect(failed.length).toBe(1)

      resolveTest(true)
    }

    worker.post(
      JSON.stringify({
        topic: 'startProcess',
        data: dataMock
      })
    )

    await workerPromise
  })

  it.each([true, false])(
    'passes withCredentials %s to the webdav client',
    async (withCredentials) => {
      webDavMock.restoreFile.mockResolvedValue({ status: 200, result: undefined, body: undefined })

      unref(worker.worker).onmessage = () => {
        resolveTest(true)
      }

      worker.post(JSON.stringify({ topic: 'startProcess', data: { ...dataMock, withCredentials } }))

      await workerPromise

      const [, , getWithCredentials] = webdavFactory.mock.calls[0]
      expect(getWithCredentials()).toBe(withCredentials)
    }
  )
})
