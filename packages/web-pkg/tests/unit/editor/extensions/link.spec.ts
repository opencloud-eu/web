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
      ['mailto:user@opencloud.eu', 'mailto:user@opencloud.eu']
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
      'java\nscript:alert(1)'
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
  })
})
