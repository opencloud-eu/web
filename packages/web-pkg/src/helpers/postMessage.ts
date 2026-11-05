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

export function isMessageFromParent(event: MessageEvent, expectedOrigin?: string): boolean {
  if (window.parent === window || !event.source || event.source !== window.parent) {
    return false
  }

  return !expectedOrigin || event.origin === expectedOrigin
}
