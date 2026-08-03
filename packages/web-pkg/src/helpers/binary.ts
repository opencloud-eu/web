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
