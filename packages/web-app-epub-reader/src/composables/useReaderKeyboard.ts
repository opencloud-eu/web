import { Rendition } from 'epubjs'
import { Key, useKeyboardActions } from '@opencloud-eu/web-pkg'
import { Ref, watch } from 'vue'

type ReaderKeyboardOptions = {
  rendition: Ref<Rendition | undefined>
  onPrevious: () => void
  onNext: () => void
  onClose: () => void
}

/**
 * Arrow keys turn pages. Key events inside the book's iframe don't reach the document, epub.js
 * forwards them as rendition events instead, so Esc has to close the app from there as well.
 * epub.js forwards from a passive listener, so the forwarded events can't be prevented.
 */
export function useReaderKeyboard({
  rendition,
  onPrevious,
  onNext,
  onClose
}: ReaderKeyboardOptions) {
  const { bindKeyAction } = useKeyboardActions()
  bindKeyAction({ primary: Key.ArrowLeft }, onPrevious)
  bindKeyAction({ primary: Key.ArrowRight }, onNext)

  watch(
    rendition,
    (currentRendition) => {
      currentRendition?.on('keydown', (event: KeyboardEvent) => {
        if (event.key === Key.Esc) {
          onClose()
        }
        if (event.key === Key.ArrowLeft) {
          onPrevious()
        }
        if (event.key === Key.ArrowRight) {
          onNext()
        }
      })
    },
    { immediate: true }
  )
}
