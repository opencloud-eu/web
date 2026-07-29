import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import {
  createLinkExtension,
  isAllowedLinkUrl,
  normalizeLinkUrl
} from '../../../../src/editor/extensions/link'

describe('editor link extension', () => {
  describe('normalizeLinkUrl', () => {
    it.each([
      [' https://opencloud.eu/docs ', 'https://opencloud.eu/docs'],
      ['http://opencloud.eu', 'http://opencloud.eu/'],
      ['opencloud.eu', 'https://opencloud.eu/'],
      ['//opencloud.eu/path', 'https://opencloud.eu/path'],
      ['mailto:user@opencloud.eu', 'mailto:user@opencloud.eu'],
      [' #headlines ', '#headlines']
    ])('normalizes %s', (input, expected) => {
      expect(normalizeLinkUrl(input)).toBe(expected)
    })

    it.each([
      '',
      'javascript:alert(1)',
      'data:text/html,test',
      'vbscript:msgbox(1)',
      'ftp://opencloud.eu',
      'https://',
      'java\nscript:alert(1)',
      '#',
      '#invalid fragment'
    ])('rejects unsafe or invalid value %s', (input) => {
      expect(normalizeLinkUrl(input)).toBeNull()
      expect(isAllowedLinkUrl(input)).toBe(false)
    })
  })

  it('uses one safe configuration for every content strategy', () => {
    const extension = createLinkExtension()
    const validationContext = {
      defaultValidate: () => true,
      protocols: [] as string[],
      defaultProtocol: 'https'
    }
    expect(extension.options).toMatchObject({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: 'https',
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' }
    })
    expect(extension.options.isAllowedUri('javascript:alert(1)', validationContext)).toBe(false)
    expect(extension.options.isAllowedUri('https://opencloud.eu', validationContext)).toBe(true)
    expect(extension.options.isAllowedUri('#headlines', validationContext)).toBe(true)
    expect(extension.options.shouldAutoLink('#headlines')).toBe(false)
  })

  it('still applies the default URI validation to external links', () => {
    const extension = createLinkExtension()
    const validationContext = {
      defaultValidate: () => false,
      protocols: [] as string[],
      defaultProtocol: 'https'
    }

    expect(extension.options.isAllowedUri('https://opencloud.eu', validationContext)).toBe(false)
    expect(extension.options.isAllowedUri('#headlines', validationContext)).toBe(true)
  })

  it('autolinks typed URLs when followed by a space', () => {
    const editor = new Editor({
      extensions: [StarterKit.configure({ link: false }), createLinkExtension()]
    })

    for (const character of 'https://opencloud.eu ') {
      editor.commands.insertContent(character)
    }

    const paragraph = editor.state.doc.firstChild!
    expect(paragraph.textContent).toBe('https://opencloud.eu ')
    expect(paragraph.child(0).text).toBe('https://opencloud.eu')
    expect(paragraph.child(0).marks.find(({ type }) => type.name === 'link')?.attrs.href).toBe(
      'https://opencloud.eu'
    )
    expect(paragraph.child(1).text).toBe(' ')
    expect(paragraph.child(1).marks.some(({ type }) => type.name === 'link')).toBe(false)
    editor.destroy()
  })
})
