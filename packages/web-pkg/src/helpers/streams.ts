/**
 * Tiny helpers for collecting a `ReadableStream<Uint8Array>` into a concrete
 * buffer type. They wrap `new Response(stream)` so call sites don't have to
 * reach into the Fetch API for what is really just a stream-to-bytes
 * conversion.
 *
 * Today every encrypt/decrypt path inside the vault flow ends in one of
 * these because the surrounding transports (webdav PUT, Uppy + tus, blob
 * URLs) require sliceable bytes. Once a transport can consume a stream
 * directly, the corresponding call site loses the helper but the engine
 * API stays unchanged.
 */

export function streamToArrayBuffer(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  return new Response(stream).arrayBuffer()
}

export function streamToBlob(stream: ReadableStream<Uint8Array>, type?: string): Promise<Blob> {
  if (!type) {
    return new Response(stream).blob()
  }
  // Response#blob() preserves whatever content-type the stream's underlying
  // source declared (usually "" for our engines). When the caller already
  // knows what kind of bytes they're producing, rewrap with the right type.
  return new Response(stream).blob().then((b) => new Blob([b], { type }))
}
