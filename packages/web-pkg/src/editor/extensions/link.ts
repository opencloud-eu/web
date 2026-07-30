import { getMarkRange, type Editor } from '@tiptap/core'
import Link from '@tiptap/extension-link'

const allowedProtocols = new Set(['http:', 'https:', 'mailto:'])
const protocolPattern = /^([a-z][a-z\d+.-]*):/i
const unsafeWhitespacePattern = /[\s\u0000-\u001f\u007f]/

interface ParsedLinkUrl {
  href: string
  type: 'fragment' | 'url'
}

function parseLinkUrl(value: string): ParsedLinkUrl | null {
  const trimmed = value.trim()
  if (!trimmed || unsafeWhitespacePattern.test(trimmed)) {
    return null
  }

  if (trimmed.startsWith('#')) {
    return trimmed.length > 1 ? { href: trimmed, type: 'fragment' } : null
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
      return url.pathname ? { href: url.href, type: 'url' } : null
    }
    return url.hostname ? { href: url.href, type: 'url' } : null
  } catch {
    return null
  }
}

export function normalizeLinkUrl(value: string): string | null {
  return parseLinkUrl(value)?.href || null
}

export function isAllowedLinkUrl(value: string): boolean {
  return parseLinkUrl(value) !== null
}

function shouldAutoLink(value: string): boolean {
  return parseLinkUrl(value)?.type === 'url'
}

function exitLinkOnSpace(editor: Editor): boolean {
  const { selection } = editor.state
  if (!selection.empty) {
    return false
  }

  const linkType = editor.schema.marks.link
  const linkMark = selection.$from.nodeBefore?.marks.find(({ type }) => type === linkType)
  if (!linkMark) {
    return false
  }

  const linkRange = getMarkRange(selection.$from, linkType, linkMark.attrs)
  if (!linkRange || selection.from !== linkRange.to) {
    return false
  }

  return editor.chain().unsetMark(linkType).insertContent(' ').run()
}

const LinkWithSpaceExit = Link.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Space: () => exitLinkOnSpace(this.editor)
    }
  }
})

export function createLinkExtension() {
  return LinkWithSpaceExit.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    defaultProtocol: 'https',
    isAllowedUri: (value, { defaultValidate }) => {
      const parsed = parseLinkUrl(value)
      return parsed?.type === 'fragment' || (parsed?.type === 'url' && defaultValidate(parsed.href))
    },
    shouldAutoLink,
    HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' }
  })
}
