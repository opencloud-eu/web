import UploadInfo from '../../../src/components/UploadInfo.vue'
import UploadInfoItem from '../../../src/components/UploadInfoItem.vue'
import { defaultPlugins, shallowMount, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { OcUppyFile } from '@opencloud-eu/web-pkg'
import { Component, defineComponent, h, nextTick } from 'vue'
import { HttpError } from '@opencloud-eu/web-client'

const selectors = {
  overlay: '#upload-info',
  title: '.upload-info-title p',
  body: '.upload-info-body',
  collapseButton: '#collapse-upload-info-btn',
  closeButton: '#close-upload-info-btn',
  retryButton: '#retry-upload-info-btn',
  progress: '.upload-info-progress',
  success: '.upload-info-success',
  error: '.upload-info-danger',
  message: '.upload-info-message',
  itemStatus: '.upload-info-item-status',
  info: {
    items: '.upload-info-items',
    item: '.upload-info-items li'
  }
}

const announceMock = vi.fn()
const OcHiddenAnnouncerStub = defineComponent({
  props: { level: { type: String, default: 'polite' } },
  setup(props, { expose }) {
    expose({ announce: (message: string) => announceMock(message, props.level) })
    return () => h('span')
  }
})

describe('UploadInfo component', () => {
  afterEach(() => {
    announceMock.mockReset()
  })
  it('should render the component in a hidden state per default', () => {
    const { wrapper } = getShallowWrapper()
    const overlay = wrapper.find(selectors.overlay)
    expect(overlay.exists()).toBeFalsy()
  })
  it('should show the component', async () => {
    const { wrapper } = getShallowWrapper()
    ;(wrapper.vm as any).showInfo = true
    await nextTick()
    const overlay = wrapper.find(selectors.overlay)
    expect(overlay.exists()).toBeTruthy()
  })
  it('should keep title visible and hide body when collapsed', async () => {
    const { wrapper } = getShallowWrapper()
    ;(wrapper.vm as any).showInfo = true
    await nextTick()

    expect(wrapper.find(selectors.title).exists()).toBeTruthy()
    expect(wrapper.find(selectors.body).exists()).toBeTruthy()

    await wrapper.find(selectors.collapseButton).trigger('click')

    expect(wrapper.find(selectors.title).exists()).toBeTruthy()
    expect(wrapper.find(selectors.body).exists()).toBeFalsy()
  })
  describe('title', () => {
    it('should show that an upload is in progress', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      ;(wrapper.vm as any).inPreparation = false
      ;(wrapper.vm as any).itemsInProgressCount = 1
      ;(wrapper.vm as any).runningUploads = 1
      await nextTick()

      const uploadTitle = wrapper.find(selectors.title).text()
      expect(uploadTitle).toBe('1 item uploading...')
    })
    it('should show that an upload was successful', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      ;(wrapper.vm as any).successful = ['1']
      await nextTick()

      const uploadTitle = wrapper.find(selectors.title).text()
      expect(uploadTitle).toBe('Upload completed')
    })
    it('should show that an upload failed', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      ;(((wrapper.vm as any).errors = { '1': new HttpError('', undefined) }), await nextTick())

      const uploadTitle = wrapper.find(selectors.title).text()
      expect(uploadTitle).toBe('Upload failed')
    })
    it('should show that an upload was cancelled', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      ;(wrapper.vm as any).uploadsCancelled = true
      await nextTick()

      const uploadTitle = wrapper.find(selectors.title).text()
      expect(uploadTitle).toBe('Upload cancelled')
    })
    it('should show that an upload is preparing', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      ;(wrapper.vm as any).runningUploads = 1
      ;(wrapper.vm as any).inPreparation = true
      await nextTick()

      const uploadTitle = wrapper.find(selectors.title).text()
      expect(uploadTitle).toBe('Preparing upload...')
    })
    it('should show that an upload is being finalized', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      ;(wrapper.vm as any).itemsInProgressCount = 1
      ;(wrapper.vm as any).runningUploads = 1
      ;(wrapper.vm as any).inFinalization = true
      await nextTick()

      const uploadTitle = wrapper.find(selectors.title).text()
      expect(uploadTitle).toBe('Finalizing upload...')
    })
  })
  describe('progress bar', () => {
    it('should show the progress bar when an upload is in progress', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      ;(wrapper.vm as any).itemsInProgressCount = 1
      ;(wrapper.vm as any).runningUploads = 1
      await nextTick()

      const progressBar = wrapper.find(selectors.progress)
      expect(progressBar.exists()).toBeTruthy()
    })
  })
  describe('info', () => {
    it('should show the number of successful files', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      ;(wrapper.vm as any).uploads = {
        '1': { meta: { isFolder: false } } as OcUppyFile,
        '2': { meta: { isFolder: false } } as OcUppyFile
      }
      ;(wrapper.vm as any).successful = ['1', '2']
      await nextTick()

      const info = wrapper.find(selectors.success).text()
      expect(info).toBe('2 files uploaded')
    })
    it('should show the number of successful folders', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      ;(wrapper.vm as any).uploads = {
        '1': { meta: { isFolder: true } } as OcUppyFile,
        '2': { meta: { isFolder: true } } as OcUppyFile
      }
      ;(wrapper.vm as any).successful = ['1', '2']
      await nextTick()

      const info = wrapper.find(selectors.success).text()
      expect(info).toBe('2 folders uploaded')
    })
    it('should show both files and folders when mixed', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      ;(wrapper.vm as any).uploads = {
        '1': { meta: { isFolder: false } } as OcUppyFile,
        '2': { meta: { isFolder: true } } as OcUppyFile
      }
      ;(wrapper.vm as any).successful = ['1', '2']
      await nextTick()

      const info = wrapper.find(selectors.success).text()
      expect(info).toBe('1 file, 1 folder uploaded')
    })
    it('should show the number of failed items', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      ;(wrapper.vm as any).errors = { '1': new HttpError('', undefined) }
      ;(wrapper.vm as any).successful = ['1']
      await nextTick()

      const info = wrapper.find(selectors.error).text()
      expect(info).toBe('1 of 2 items failed')
    })
  })
  describe('details', () => {
    it('should hide the info by default', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      await nextTick()

      const info = wrapper.find(selectors.info.items)
      expect(info.exists()).toBeFalsy()
    })
    it('should list all the uploaded files when the info is displayed', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).showInfo = true
      ;(wrapper.vm as any).infoExpanded = true
      ;(wrapper.vm as any).uploads = {
        '1': {
          name: 'file',
          path: '/',
          type: 'file',
          meta: { uploadId: '1' }
        } as unknown as OcUppyFile,
        '2': {
          name: 'file2',
          path: '/',
          type: 'file',
          meta: { uploadId: '2' }
        } as unknown as OcUppyFile
      }

      await nextTick()

      const info = wrapper.find(selectors.info.items)
      expect(info.exists()).toBeTruthy()

      expect(wrapper.findAllComponents(UploadInfoItem).length).toBe(2)
    })
  })
  describe('retry', () => {
    const rootFile = {
      id: 'file',
      name: 'file.txt',
      meta: { uploadId: 'file', relativeFolder: '', currentFolder: '/A' }
    } as OcUppyFile
    const rootFolder = {
      id: 'folder',
      name: 'folder',
      meta: { uploadId: 'folder', relativeFolder: '', currentFolder: '/A', isFolder: true }
    } as OcUppyFile
    const nestedFile = (id: string) =>
      ({
        id,
        name: `${id}.txt`,
        meta: {
          uploadId: id,
          relativeFolder: '/folder',
          topLevelFolderId: 'folder',
          currentFolder: '/A'
        }
      }) as OcUppyFile
    const error = { statusCode: 409 } as HttpError

    it('keeps the close button visible when a folder failed to be created', async () => {
      const { wrapper, handlers } = getWrapperWithHandlers()
      handlers.uploadStarted()
      handlers.addedForUpload([rootFolder])
      handlers.uploadError({ file: rootFolder, error })
      await nextTick()

      expect((wrapper.vm as any).itemsInProgressCount).toBe(0)
      expect(wrapper.find(selectors.closeButton).exists()).toBeTruthy()
    })
    it('keeps the close button visible when a subfolder failed to be created', async () => {
      const subFolder = {
        id: 'sub',
        name: 'sub',
        meta: { uploadId: 'sub', relativeFolder: '/folder', currentFolder: '/A', isFolder: true }
      } as OcUppyFile
      const { wrapper, handlers } = getWrapperWithHandlers()
      handlers.uploadStarted()
      handlers.addedForUpload([rootFolder])
      handlers.uploadSuccess(rootFolder)
      handlers.addedForUpload([subFolder])
      handlers.uploadError({ file: subFolder, error })
      handlers.uploadCompleted()
      await nextTick()

      expect(wrapper.find(selectors.closeButton).exists()).toBeTruthy()
    })
    it('hides the retry button after the uploads were cancelled', async () => {
      const { wrapper, handlers } = getWrapperWithHandlers()
      handlers.uploadStarted()
      handlers.addedForUpload([rootFile])
      handlers.uploadError({ file: rootFile, error })
      ;(wrapper.vm as any).cancelAllUploads()
      await nextTick()

      expect(wrapper.find(selectors.retryButton).exists()).toBeFalsy()
    })
    it('hides the retry button when only folders failed', async () => {
      const { wrapper, handlers } = getWrapperWithHandlers()
      handlers.uploadStarted()
      handlers.addedForUpload([rootFolder])
      handlers.uploadError({ file: rootFolder, error })
      handlers.uploadCompleted()
      await nextTick()

      expect(wrapper.find(selectors.retryButton).exists()).toBeFalsy()
    })
    it('retries failed files only and finishes afterwards', async () => {
      const { wrapper, mocks, handlers } = getWrapperWithHandlers()
      handlers.uploadStarted()
      handlers.addedForUpload([rootFolder])
      handlers.uploadError({ file: rootFolder, error })
      handlers.addedForUpload([rootFile])
      handlers.uploadError({ file: rootFile, error })
      handlers.uploadCompleted()
      await nextTick()

      await wrapper.find(selectors.retryButton).trigger('click')
      expect(mocks.$uppyService.retryAllUploads).toHaveBeenCalled()

      handlers.uploadSuccess(rootFile)
      handlers.uploadCompleted()
      await nextTick()

      const vm = wrapper.vm as any
      expect(wrapper.find(selectors.closeButton).exists()).toBeTruthy()
      expect(Object.keys(vm.errors)).toEqual(['folder'])
      expect(vm.uploads.folder.status).toBe('error')
    })
    it('counts a top level folder only once when retrying several of its files', async () => {
      const { wrapper, handlers } = getWrapperWithHandlers()
      handlers.uploadStarted()
      handlers.addedForUpload([rootFolder])
      handlers.uploadSuccess(rootFolder)
      handlers.addedForUpload([nestedFile('a'), nestedFile('b')])
      handlers.uploadError({ file: nestedFile('a'), error })
      handlers.uploadError({ file: nestedFile('b'), error })
      handlers.uploadCompleted()
      await nextTick()

      await wrapper.find(selectors.retryButton).trigger('click')
      const vm = wrapper.vm as any
      expect(vm.itemsInProgressCount).toBe(1)

      handlers.uploadSuccess(nestedFile('a'))
      handlers.uploadSuccess(nestedFile('b'))
      await nextTick()

      expect(vm.itemsInProgressCount).toBe(0)
      expect(wrapper.find(selectors.closeButton).exists()).toBeTruthy()
      expect(vm.uploads.folder.status).toBe('success')
    })
  })
  describe('failed files of earlier uploads', () => {
    it('removes them when an upload starts while nothing is uploading', () => {
      const { mocks, handlers } = getWrapperWithHandlers()
      handlers.uploadStarted()
      handlers.uploadCompleted()
      mocks.$uppyService.removeFailedFiles.mockClear()

      handlers.uploadStarted()

      expect(mocks.$uppyService.removeFailedFiles).toHaveBeenCalledTimes(1)
    })
    it('keeps them when an upload starts while another one is still running or being prepared', () => {
      const { mocks, handlers } = getWrapperWithHandlers()
      handlers.uploadStarted()
      mocks.$uppyService.removeFailedFiles.mockClear()

      handlers.uploadStarted()

      expect(mocks.$uppyService.removeFailedFiles).not.toHaveBeenCalled()
    })
  })
  describe('pause and resume', () => {
    it('does not count the paused duration as upload time', () => {
      vi.useFakeTimers()
      const { wrapper } = getShallowWrapper()
      const vm = wrapper.vm as any
      const start = Date.now()
      vm.timeStarted = new Date(start)

      vm.togglePauseUploads()
      vi.advanceTimersByTime(10000)
      vm.togglePauseUploads()

      expect(vm.timeStarted.getTime()).toBe(start + 10000)
      vi.useRealTimers()
    })
  })
  describe('screen reader announcements', () => {
    it('announces the start of an upload', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).runningUploads = 1
      await nextTick()

      expect(announceMock).toHaveBeenCalledWith('Preparing upload...', 'polite')
    })
    it('announces a completed upload', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).runningUploads = 1
      await nextTick()
      ;(wrapper.vm as any).successful = ['1']
      ;(wrapper.vm as any).runningUploads = 0
      await nextTick()

      expect(announceMock).toHaveBeenLastCalledWith('Upload completed. 1 file uploaded', 'polite')
    })
    it('announces a failed upload assertively', async () => {
      const { wrapper } = getShallowWrapper()
      ;(wrapper.vm as any).runningUploads = 1
      await nextTick()
      ;(wrapper.vm as any).errors = { '1': new HttpError('', undefined) }
      ;(wrapper.vm as any).runningUploads = 0
      await nextTick()

      expect(announceMock).toHaveBeenLastCalledWith(
        'Upload failed. 1 of 1 item failed',
        'assertive'
      )
    })
  })
  describe('upload progress', () => {
    const file = { meta: { uploadId: '1' } }

    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('applies progress events at a bounded rate', () => {
      const { wrapper, handlers } = getWrapperWithHandlers()
      const vm = wrapper.vm as any
      vm.bytesTotal = 100

      for (let i = 1; i <= 10; i++) {
        handlers['upload-progress']({ file, progress: { bytesUploaded: i } })
      }
      expect(vm.bytesUploaded).toBe(1)

      vi.advanceTimersByTime(500)
      expect(vm.bytesUploaded).toBe(10)
    })
    it('sums up the progress of several files', () => {
      const { wrapper, handlers } = getWrapperWithHandlers()
      const vm = wrapper.vm as any
      vm.bytesTotal = 100

      handlers['upload-progress']({ file, progress: { bytesUploaded: 10 } })
      handlers['upload-progress']({
        file: { meta: { uploadId: '2' } },
        progress: { bytesUploaded: 5 }
      })
      handlers['upload-progress']({ file, progress: { bytesUploaded: 20 } })
      vi.advanceTimersByTime(500)

      expect(vm.bytesUploaded).toBe(25)
    })
    it('drops a pending update when the progress gets reset', () => {
      const { wrapper, handlers } = getWrapperWithHandlers()
      const vm = wrapper.vm as any
      vm.bytesTotal = 100

      handlers['upload-progress']({ file, progress: { bytesUploaded: 10 } })
      handlers['upload-progress']({ file, progress: { bytesUploaded: 100 } })
      vm.resetProgress()
      vi.advanceTimersByTime(500)

      expect(vm.bytesUploaded).toBe(0)
      expect(vm.inFinalization).toBe(false)
    })
    it('does not re-render the listed items', async () => {
      const renderItem = vi.fn()
      const UploadInfoItemStub = defineComponent({
        name: 'UploadInfoItem',
        props: {
          item: { type: Object, required: true },
          error: { type: Object, default: undefined },
          uploadsPaused: Boolean
        },
        setup() {
          return () => {
            renderItem()
            return h('li')
          }
        }
      })
      const { wrapper, handlers } = getWrapperWithHandlers({ UploadInfoItem: UploadInfoItemStub })
      const vm = wrapper.vm as any
      vm.showInfo = true
      vm.infoExpanded = true
      vm.runningUploads = 1
      vm.bytesTotal = 100
      vm.uploads = { '1': { name: 'file', meta: { uploadId: '1' } } }
      await nextTick()
      expect(renderItem).toHaveBeenCalled()
      renderItem.mockClear()

      for (let i = 1; i <= 5; i++) {
        handlers['upload-progress']({ file, progress: { bytesUploaded: i * 10 } })
        vi.advanceTimersByTime(500)
        await nextTick()
      }

      expect(vm.remainingTime).toBeDefined()
      expect(renderItem).not.toHaveBeenCalled()
    })
  })
  describe('unmount', () => {
    it('unsubscribes all uppy service handlers', () => {
      const { wrapper, mocks } = getShallowWrapper()
      const topics = mocks.$uppyService.subscribe.mock.calls.map(([topic]) => topic)

      wrapper.unmount()

      expect(topics.length).toBeGreaterThan(0)
      expect(mocks.$uppyService.unsubscribe.mock.calls).toEqual(
        topics.map((topic) => [topic, `${topic}-token`])
      )
    })
  })
  describe('getRemainingTime method', () => {
    it.each([
      { ms: 1000, expected: 'Few seconds left' },
      { ms: 1000 * 60 * 30, expected: '30 minutes left' },
      { ms: 1000 * 60 * 60, expected: '1 hour left' },
      { ms: 1000 * 60 * 60 * 2, expected: '2 hours left' }
    ])('should return the proper string', ({ ms, expected }) => {
      const { wrapper } = getShallowWrapper()
      const estimatedTime = (wrapper.vm as any).getRemainingTime(ms)
      expect(estimatedTime).toBe(expected)
    })
  })
})

function getWrapperWithHandlers(stubs: Record<string, Component> = {}) {
  const { wrapper, mocks } = getShallowWrapper(stubs)
  const handlers: Record<string, (...args: unknown[]) => void> = {}
  for (const [event, handler] of mocks.$uppyService.subscribe.mock.calls) {
    handlers[event] = handler
  }
  return { wrapper, mocks, handlers }
}

function getShallowWrapper(stubs: Record<string, Component> = {}) {
  const mocks = {
    ...defaultComponentMocks()
  }
  mocks.$uppyService.subscribe.mockImplementation((topic) => `${topic}-token`)

  return {
    mocks,
    wrapper: shallowMount(UploadInfo, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks,
        stubs: { OcHiddenAnnouncer: OcHiddenAnnouncerStub, ...stubs }
      }
    })
  }
}
