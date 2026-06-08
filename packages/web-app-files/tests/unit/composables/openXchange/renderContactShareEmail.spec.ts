import { Language } from 'vue3-gettext'
import { renderContactShareEmail } from '../../../../src/composables/openXchange/renderContactShareEmail'

// minimal $gettext stub that interpolates %{placeholders}
const $gettext = ((msgid: string, params: Record<string, string | number> = {}) =>
  msgid.replace(/%\{(\w+)\}/g, (_, key) => String(params[key] ?? ''))) as Language['$gettext']

describe('renderContactShareEmail', () => {
  const base = {
    contactName: 'Jane Doe',
    resourceName: 'Report.pdf',
    linkUrl: 'https://cloud.example.com/s/abc123'
  }

  it('builds the subject from the resource name', () => {
    const { subject } = renderContactShareEmail(base, $gettext)
    expect(subject).toBe('«Report.pdf» was shared with you')
  })

  it('includes greeting, body, call-to-action link and the OpenCloud footer', () => {
    const { html } = renderContactShareEmail(base, $gettext)
    expect(html).toContain('Dear Jane Doe,')
    expect(html).toContain('«Report.pdf» has been shared with you')
    expect(html).toContain('<a href="https://cloud.example.com/s/abc123">Open «Report.pdf»</a>')
    expect(html).toContain('OpenCloud - a safe home for all your data')
    expect(html).toContain('<a href="https://opencloud.eu">https://opencloud.eu</a>')
  })

  it('omits the password line when no password is given', () => {
    const { html } = renderContactShareEmail(base, $gettext)
    expect(html).not.toContain('protected by the following password')
  })

  it('includes the password line when a password is given', () => {
    const { html } = renderContactShareEmail({ ...base, password: 'S3cr3t!' }, $gettext)
    expect(html).toContain('The link is protected by the following password: S3cr3t!')
  })

  it('escapes html in interpolated values', () => {
    const { html } = renderContactShareEmail(
      { ...base, contactName: '<b>x</b>', resourceName: 'a&b<c>' },
      $gettext
    )
    expect(html).toContain('Dear &lt;b&gt;x&lt;/b&gt;,')
    expect(html).toContain('a&amp;b&lt;c&gt;')
    expect(html).not.toContain('<b>x</b>')
  })
})
