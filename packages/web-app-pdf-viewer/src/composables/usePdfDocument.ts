import { nextTick, onBeforeUnmount, ref, shallowRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'
import { useModals } from '@opencloud-eu/web-pkg'
import { loadPdfDocument, type PasswordRequest } from '../helpers/pdfjs'

/**
 * Loads the file into PDF.js, also again after page operations, which rebuild it. Others start
 * over with each document in one of two ways: what reads data from it (outline, attachments,
 * properties) watches `pdfDocument`, what depends on the pages shown (layers, page labels, view
 * state) listens to PDF.js' `pagesinit`. `onLoaded` sets the document in the viewer in the same
 * tick as `pdfDocument` changes, reads check the document is still current when they resolve.
 */
export function usePdfDocument({
  onLoaded,
  onPasswordCancelled
}: {
  /** `pageNumber` is the page to show, as passed to `load()`. */
  onLoaded: (doc: PDFDocumentProxy, options: { pageNumber: number }) => void
  /** The password prompt was cancelled, the document stays closed. */
  onPasswordCancelled: () => void
}) {
  const { $gettext } = useGettext()
  const { dispatchModal, removeModal, updateModal } = useModals()

  const pdfDocument = shallowRef<PDFDocumentProxy>()
  const isLoading = ref(false)
  const loadError = ref<Error>()
  // Changes with every loaded document, so per-document UI like thumbnails can start fresh.
  const documentKey = ref(0)
  let currentTask: PDFDocumentLoadingTask | undefined
  let pendingTask: PDFDocumentLoadingTask | undefined
  // The password that unlocked the document. Documents rebuilt from it (e.g. after deleting
  // a page) are encrypted the same way, so users don't have to enter it again. Memory only.
  let password: string | undefined
  let submittedPassword: string | undefined
  let passwordModalId: string | undefined
  // The open prompt's callbacks into PDF.js, new ones with every attempt.
  let passwordRequest: Pick<PasswordRequest, 'submit' | 'cancel'> | undefined
  // The prompt stays open while PDF.js tries the password: the modal closes once the attempt
  // resolves, and stays with a rejection (see ModalWrapper of web-runtime).
  let passwordAttempt: { resolve: () => void; reject: () => void } | undefined
  // E.g. a page operation finishing after the app was closed must not start a new worker.
  let isUnmounted = false

  function settlePasswordAttempt(isCorrect: boolean) {
    const attempt = passwordAttempt
    passwordAttempt = undefined
    if (isCorrect) {
      attempt?.resolve()
      passwordModalId = undefined
    } else {
      attempt?.reject()
    }
  }

  function askForPassword({ isRetry, submit, cancel }: PasswordRequest) {
    passwordRequest = { submit, cancel }
    // A wrong password typed into the open prompt: it stays, with the error.
    if (isRetry && passwordModalId) {
      settlePasswordAttempt(false)
      updateModal(passwordModalId, 'inputError', $gettext('Invalid password. Please try again.'))
      return
    }
    passwordModalId = dispatchModal({
      elementClass: 'pdf-viewer-password-modal',
      title: $gettext('Password required'),
      message: $gettext('This PDF file is protected. Enter the password to open it.'),
      confirmText: $gettext('Open'),
      hasInput: true,
      inputType: 'password',
      inputLabel: $gettext('Password'),
      // Nothing to try without a password. The error goes with the next attempt.
      confirmDisabled: true,
      onInput: (value: string) => {
        updateModal(passwordModalId, 'inputError', undefined)
        updateModal(passwordModalId, 'confirmDisabled', !value)
      },
      onConfirm: (value: string) => {
        submittedPassword = value
        passwordRequest.submit(value)
        return new Promise<void>((resolve, reject) => {
          passwordAttempt = { resolve, reject }
        })
      },
      onCancel: () => {
        passwordModalId = undefined
        passwordRequest.cancel()
        onPasswordCancelled()
      }
    }).id
    // E.g. the password of the unlocked document doesn't fit a rebuilt one. OcTextInput shows
    // an error only once it changes, so not with the modal's first render.
    if (isRetry) {
      const id = passwordModalId
      nextTick(() => updateModal(id, 'inputError', $gettext('Invalid password. Please try again.')))
    }
  }

  async function load(data: ArrayBuffer, { pageNumber = 1 }: { pageNumber?: number } = {}) {
    if (isUnmounted) {
      return
    }
    pendingTask?.destroy()
    submittedPassword = undefined
    // A copy, AppWrapper keeps the original as the content of the file.
    const task = loadPdfDocument(data.slice(0), {
      password,
      onPasswordRequest: askForPassword
    })
    pendingTask = task
    isLoading.value = true
    loadError.value = undefined

    try {
      const doc = await task.promise
      settlePasswordAttempt(true)
      if (task !== pendingTask) {
        return
      }
      const previousTask = currentTask
      currentTask = task
      password = submittedPassword ?? password
      pdfDocument.value = doc
      documentKey.value++
      onLoaded(doc, { pageNumber })
      // Only now that the viewer shows the new document the old one can go.
      previousTask?.destroy()
    } catch (e) {
      // Whatever went wrong, the prompt is done.
      settlePasswordAttempt(true)
      // Destroying a task (newer load, cancelled password prompt) rejects it as well.
      if (task === pendingTask && !task.destroyed) {
        // PDF.js' exceptions have no stack, the console would only show their class name.
        const error = e as Error
        console.error(`${error.name}: ${error.message}`)
        loadError.value = error
      }
    } finally {
      if (task === pendingTask) {
        pendingTask = undefined
        isLoading.value = false
      }
    }
  }

  onBeforeUnmount(() => {
    isUnmounted = true
    if (passwordModalId) {
      removeModal(passwordModalId)
    }
    settlePasswordAttempt(true)
    pendingTask?.destroy()
    currentTask?.destroy()
  })

  return {
    pdfDocument,
    isLoading,
    loadError,
    documentKey,
    load
  }
}
