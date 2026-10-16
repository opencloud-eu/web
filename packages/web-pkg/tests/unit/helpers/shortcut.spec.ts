import { getShortcutUrl } from '../../../src/helpers/shortcut'

describe('getShortcutUrl', () => {
  it.each([
    {
      input: 'https://example.com/search?q=x<2&lang=de#<b>',
      expected: 'https://example.com/search?q=x%3C2&lang=de#%3Cb%3E'
    },
    {
      input: 'https://example.com/?q=<script>alert(1)</script>&other="value"',
      expected: 'https://example.com/?q=%3Cscript%3Ealert(1)%3C/script%3E&other=%22value%22'
    },
    { input: 'HTTP://example.com/path', expected: 'http://example.com/path' },
    { input: 'hTtPs://EXAMPLE.com:443/path', expected: 'https://example.com/path' },
    {
      input: 'https://example.com/?q=%3Cscript%3E&lang=de',
      expected: 'https://example.com/?q=%3Cscript%3E&lang=de'
    },
    {
      input: 'https://example.com/?q=über uns',
      expected: 'https://example.com/?q=%C3%BCber%20uns'
    }
  ])('normalizes "$input" without HTML escaping', ({ input, expected }) => {
    expect(getShortcutUrl(input)).toBe(expected)
  })

  it.each(['example.org/path', 'localhost:8080/foo', 'example.org:8443/path', '[::1]:8080/'])(
    'adds HTTPS to "%s"',
    (url) => {
      expect(getShortcutUrl(url)).toBe(`https://${url}`)
    }
  )

  it('trims surrounding spaces', () => {
    expect(getShortcutUrl('  https://example.org/  ')).toBe('https://example.org/')
  })

  it.each([
    { separator: '\n', expected: 'https://example.org/URL=javascript:alert(1)' },
    { separator: '\r\n', expected: 'https://example.org/URL=javascript:alert(1)' },
    { separator: '\t', expected: 'https://example.org/URL=javascript:alert(1)' },
    { separator: '\u0000', expected: 'https://example.org/%00URL=javascript:alert(1)' },
    { separator: '\u007f', expected: 'https://example.org/%7FURL=javascript:alert(1)' },
    { separator: '\u2028', expected: 'https://example.org/%E2%80%A8URL=javascript:alert(1)' },
    { separator: '\u2029', expected: 'https://example.org/%E2%80%A9URL=javascript:alert(1)' }
  ])(
    'normalizes control characters without injecting shortcut entries',
    ({ separator, expected }) => {
      expect(getShortcutUrl(`https://example.org/${separator}URL=javascript:alert(1)`)).toBe(
        expected
      )
    }
  )

  it.each([
    '',
    'https://',
    'https://example.org:invalid',
    'https://exa mple.org',
    'javascript:alert(1)',
    'JaVaScRiPt:alert(document.domain)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://example.org/file',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'mailto:user@example.org'
  ])('rejects the invalid or unsafe target "%s"', (url) => {
    expect(getShortcutUrl(url)).toBeUndefined()
  })
})
