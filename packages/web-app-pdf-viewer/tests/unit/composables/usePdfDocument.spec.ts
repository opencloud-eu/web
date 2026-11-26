import { nextTick } from 'vue'
import { mock } from 'vitest-mock-extended'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useModals, type Modal } from '@opencloud-eu/web-pkg'
import { usePdfDocument } from '../../../src/composables/usePdfDocument'
import { loadPdfDocument, type PasswordRequest } from '../../../src/helpers/pdfjs'

vi.mock('../../../src/helpers/pdfjs', () => ({ loadPdfDocument: vi.fn() }))

function createTask() {
  let resolve: (doc: PDFDocumentProxy) => void
  let reject: (e: Error) => void
  const task = {
    destroyed: false,
    promise: new Promise<PDFDocumentProxy>((res, rej) => {
      resolve = res
      reject = rej
    }),
    destroy: vi.fn(() => {
      task.destroyed = true
      reject(new Error('destroyed'))
      return Promise.resolve()
    })
  }
  return { task, resolve: (doc: PDFDocumentProxy) => resolve(doc), reject: (e: Error) => reject(e) }
}

function setup() {
  const onLoaded = vi.fn()
  const onPasswordCancelled = vi.fn()
  let document: ReturnType<typeof usePdfDocument>
  let modals: ReturnType<typeof useModals>
  getComposableWrapper(() => {
    modals = useModals()
    vi.mocked(modals.dispatchModal).mockImplementation((modal) => ({ ...modal, id: 'modal' }))
    document = usePdfDocument({ onLoaded, onPasswordCancelled })
  })
  // The last password prompt
  function passwordModal() {
    return vi.mocked(modals.dispatchModal).mock.calls.at(-1)[0] as Modal
  }
  return { document, onLoaded, onPasswordCancelled, passwordModal, modals }
}

describe('usePdfDocument', () => {
  it('hands the loaded document over and destroys the previous one afterwards', async () => {
    const first = createTask()
    const second = createTask()
    vi.mocked(loadPdfDocument)
      .mockReturnValueOnce(first.task as never)
      .mockReturnValueOnce(second.task as never)
    const { document, onLoaded } = setup()

    const firstDoc = mock<PDFDocumentProxy>()
    const secondDoc = mock<PDFDocumentProxy>()
    const firstLoad = document.load(new ArrayBuffer(1))
    first.resolve(firstDoc)
    await firstLoad
    const secondLoad = document.load(new ArrayBuffer(1))
    second.resolve(secondDoc)
    await secondLoad

    expect(onLoaded).toHaveBeenCalledTimes(2)
    expect(onLoaded.mock.calls[0][0]).toBe(firstDoc)
    expect(onLoaded.mock.calls[1][0]).toBe(secondDoc)
    expect(first.task.destroy).toHaveBeenCalled()
    expect(document.isLoading.value).toBe(false)
    expect(document.documentKey.value).toBe(2)
  })

  // The worker detaches the buffer, AppWrapper keeps the original.
  it('hands a copy of the content to PDF.js', () => {
    vi.mocked(loadPdfDocument).mockReturnValue(createTask().task as never)
    const { document } = setup()
    const data = new Uint8Array([1, 2, 3]).buffer
    document.load(data)
    const [passed] = vi.mocked(loadPdfDocument).mock.calls.at(-1)
    expect(passed).not.toBe(data)
    expect(Array.from(new Uint8Array(passed))).toEqual([1, 2, 3])
  })

  it('passes the page to show along with the loaded document', async () => {
    const { task, resolve } = createTask()
    vi.mocked(loadPdfDocument).mockReturnValue(task as never)
    const { document, onLoaded } = setup()
    const load = document.load(new ArrayBuffer(1), { pageNumber: 3 })
    const doc = mock<PDFDocumentProxy>()
    resolve(doc)
    await load
    expect(onLoaded).toHaveBeenCalledTimes(1)
    expect(onLoaded.mock.calls[0][0]).toBe(doc)
    expect(onLoaded.mock.calls[0][1]).toEqual({ pageNumber: 3 })
  })

  it('reports documents that cannot be opened', async () => {
    const { task, reject } = createTask()
    vi.mocked(loadPdfDocument).mockReturnValue(task as never)
    const { document } = setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const load = document.load(new ArrayBuffer(1))
    reject(new Error('broken'))
    await load
    expect(document.loadError.value?.message).toBe('broken')
    // PDF.js' exceptions have no stack, which leaves only their minified class name otherwise.
    expect(consoleError).toHaveBeenCalledWith('Error: broken')
    consoleError.mockRestore()
  })

  it('reports a cancelled password prompt, without an error', async () => {
    const { task } = createTask()
    vi.mocked(loadPdfDocument).mockImplementation((_data, { onPasswordRequest }) => {
      onPasswordRequest({ isRetry: false, submit: vi.fn(), cancel: () => task.destroy() })
      return task as never
    })
    const { document, onPasswordCancelled, passwordModal } = setup()
    const load = document.load(new ArrayBuffer(1))
    passwordModal().onCancel()
    await load
    expect(task.destroy).toHaveBeenCalled()
    expect(onPasswordCancelled).toHaveBeenCalled()
    expect(document.loadError.value).toBeUndefined()
    expect(document.isLoading.value).toBe(false)
  })

  it('takes no empty password', () => {
    const { task } = createTask()
    vi.mocked(loadPdfDocument).mockImplementation((_data, { onPasswordRequest }) => {
      onPasswordRequest({ isRetry: false, submit: vi.fn(), cancel: vi.fn() })
      return task as never
    })
    const { document, passwordModal, modals } = setup()
    document.load(new ArrayBuffer(1))
    expect(passwordModal().confirmDisabled).toBe(true)
    passwordModal().onInput('a', vi.fn())
    expect(modals.updateModal).toHaveBeenLastCalledWith('modal', 'confirmDisabled', false)
    passwordModal().onInput('', vi.fn())
    expect(modals.updateModal).toHaveBeenLastCalledWith('modal', 'confirmDisabled', true)
  })

  it('reuses the password for documents rebuilt from the unlocked one', async () => {
    const first = createTask()
    const second = createTask()
    vi.mocked(loadPdfDocument)
      .mockImplementationOnce((_data, { onPasswordRequest }) => {
        onPasswordRequest({ isRetry: false, submit: vi.fn(), cancel: vi.fn() })
        return first.task as never
      })
      .mockReturnValueOnce(second.task as never)
    const { document, passwordModal } = setup()
    const load = document.load(new ArrayBuffer(1))
    passwordModal().onConfirm('secret')
    first.resolve(mock<PDFDocumentProxy>())
    await load

    const reload = document.load(new ArrayBuffer(1))
    second.resolve(mock<PDFDocumentProxy>())
    await reload
    expect(vi.mocked(loadPdfDocument).mock.calls[1][1]).toEqual(
      expect.objectContaining({ password: 'secret' })
    )
  })

  it('keeps the prompt open while PDF.js tries the password, with the error if it is wrong', async () => {
    const { task, resolve } = createTask()
    let request: PasswordRequest
    vi.mocked(loadPdfDocument).mockImplementation((_data, { onPasswordRequest }) => {
      request = { isRetry: false, submit: vi.fn(), cancel: vi.fn() }
      onPasswordRequest(request)
      return task as never
    })
    const { document, passwordModal, modals } = setup()
    const load = document.load(new ArrayBuffer(1))
    // The modal closes once the attempt resolves, see ModalWrapper of web-runtime.
    const firstAttempt = passwordModal().onConfirm('wrong') as Promise<void>
    expect(request.submit).toHaveBeenCalledWith('wrong')
    // PDF.js asks again: the same modal shows the error, the attempt is rejected.
    const retry = { isRetry: true, submit: vi.fn(), cancel: vi.fn() }
    vi.mocked(loadPdfDocument).mock.calls[0][1].onPasswordRequest(retry)
    await expect(firstAttempt).rejects.toBeUndefined()
    expect(modals.dispatchModal).toHaveBeenCalledTimes(1)
    expect(modals.updateModal).toHaveBeenLastCalledWith(
      'modal',
      'inputError',
      'Invalid password. Please try again.'
    )
    // The next attempt goes to the new callbacks and resolves with the document.
    const secondAttempt = passwordModal().onConfirm('right') as Promise<void>
    expect(retry.submit).toHaveBeenCalledWith('right')
    resolve(mock<PDFDocumentProxy>())
    await load
    await expect(secondAttempt).resolves.toBeUndefined()
    // The right one is remembered for documents rebuilt from it.
    const rebuilt = createTask()
    vi.mocked(loadPdfDocument).mockReturnValueOnce(rebuilt.task as never)
    const reload = document.load(new ArrayBuffer(1))
    rebuilt.resolve(mock<PDFDocumentProxy>())
    await reload
    expect(vi.mocked(loadPdfDocument).mock.calls.at(-1)[1]).toEqual(
      expect.objectContaining({ password: 'right' })
    )
  })

  it('asks again with a hint when the remembered password does not fit', async () => {
    vi.mocked(loadPdfDocument).mockImplementation((_data, { onPasswordRequest }) => {
      onPasswordRequest({ isRetry: true, submit: vi.fn(), cancel: vi.fn() })
      return createTask().task as never
    })
    const { document, passwordModal, modals } = setup()
    document.load(new ArrayBuffer(1))
    expect(passwordModal()).toEqual(expect.objectContaining({ inputType: 'password' }))
    // Shown by OcTextInput only once it changes, so after the modal's first render.
    await nextTick()
    expect(modals.updateModal).toHaveBeenCalledWith(
      'modal',
      'inputError',
      'Invalid password. Please try again.'
    )
    // The error goes with the next attempt.
    passwordModal().onInput('b', vi.fn())
    expect(modals.updateModal).toHaveBeenCalledWith('modal', 'inputError', undefined)
  })
})
