import { computed, shallowRef, unref } from 'vue'
import { getUuid } from 'pdfjs-dist'

// Same as the PDF.js viewer: up to five.
export const MAX_SIGNATURES = 5

/** The lines of a signature, as PDF.js' signature editor takes them. */
type SignatureLines = {
  curves: { points: number[] }[]
  thickness: number
  width: number
  height: number
}

export type SavedSignature = {
  uuid: string
  description: string
  lines: SignatureLines
  /** Extracted from an image or text, drawn otherwise. */
  areContours: boolean
}

/** What PDF.js' signature editor returns for a new signature. */
export type NewSignatureData = {
  newCurves: number[][]
  areContours: boolean
  thickness: number
  width: number
  height: number
}

/**
 * Signatures saved for reuse, like in the PDF.js viewer, but only kept while the viewer is open:
 * on a shared device, the next user must not get the signatures of the previous one.
 */
export function usePdfSignatureStorage() {
  const signatures = shallowRef<SavedSignature[]>([])

  const isFull = computed(() => unref(signatures).length >= MAX_SIGNATURES)

  /** Returns the uuid of the saved signature, null if there's no room. */
  function save(
    { newCurves, areContours, thickness, width, height }: NewSignatureData,
    description: string
  ) {
    if (unref(isFull)) {
      return null
    }
    const uuid = getUuid()
    // A snapshot: for a drawing, PDF.js hands back the drawn arrays themselves.
    const curves = newCurves.map((points) => ({ points: [...points] }))
    signatures.value = [
      ...unref(signatures),
      { uuid, description, areContours, lines: { curves, thickness, width, height } }
    ]
    return uuid
  }

  function remove(uuid: string) {
    signatures.value = unref(signatures).filter((signature) => signature.uuid !== uuid)
  }

  return { signatures, isFull, save, remove }
}
