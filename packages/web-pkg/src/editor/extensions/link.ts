import Link from '@tiptap/extension-link'

const allowedProtocols = new Set(['http:', 'https:', 'mailto:'])
const protocolPattern = /^([a-z][a-z\d+.-]*):/i
const unsafeWhitespacePattern = /[\s\u0000-\u001f\u007f]/

export function normalizeLinkUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || unsafeWhitespacePattern.test(trimmed)) {
    return null
  }

  const protocol = trimmed.match(protocolPattern)?.[1]?.toLowerCase()
  if (protocol && !allowedProtocols.has(`${protocol}:`)) {
    return null
  }

  const candidate = protocol
    ? trimmed
    : trimmed.startsWith('//')
      ? `https:${trimmed}`
      : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    if (!allowedProtocols.has(url.protocol)) {
      return null
    }
    if (url.protocol === 'mailto:') {
      return url.pathname ? url.href : null
    }
    return url.hostname ? url.href : null
  } catch {
    return null
  }
}

export function isAllowedLinkUrl(value: string): boolean {
  return normalizeLinkUrl(value) !== null
}

export function createLinkExtension() {
  return Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    defaultProtocol: 'https',
    isAllowedUri: isAllowedLinkUrl,
    shouldAutoLink: isAllowedLinkUrl,
    HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' }
  })
}
