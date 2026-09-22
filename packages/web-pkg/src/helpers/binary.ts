export const blobToArrayBuffer: (blob: Blob) => Promise<string | ArrayBuffer> = (blob: Blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = (e) => reject(e)
    reader.readAsArrayBuffer(blob)
  })
}

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve) => canvas.toBlob(resolve))
}

export const arrayBufferToDataUrl = (buffer: ArrayBuffer, mimeType: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(new Blob([buffer], { type: mimeType }))
  })
}

/** Draws an emoji onto a 16:9 canvas, so it can be used as a space image. */
export const emojiToImage = async (emoji: string): Promise<ArrayBuffer | string> => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const aspectRatio = 16 / 9
  const width = 720
  const height = width / aspectRatio

  canvas.width = width
  canvas.height = height

  const textSize = 0.4 * width
  context.font = `${textSize}px sans-serif`
  context.textBaseline = 'middle'
  context.textAlign = 'center'

  const heightOffset = 15
  context.fillText(emoji, canvas.width / 2, canvas.height / 2 + heightOffset)

  const blob = await canvasToBlob(canvas)
  return blobToArrayBuffer(blob)
}
