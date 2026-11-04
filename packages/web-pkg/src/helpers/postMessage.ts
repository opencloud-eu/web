export function isMessageFromIframe(
  event: MessageEvent,
  iframe: HTMLIFrameElement | null | undefined,
  expectedOrigin?: string
): boolean {
  if (!iframe?.contentWindow || event.source !== iframe.contentWindow) {
    return false
  }

  return !expectedOrigin || event.origin === expectedOrigin
}
