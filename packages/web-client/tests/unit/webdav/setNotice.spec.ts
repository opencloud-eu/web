import { mock } from 'vitest-mock-extended'
import { SetNoticeFactory } from '../../../src/webdav/setNotice'
import { DAV } from '../../../src/webdav/client'
import { DavProperty } from '../../../src/webdav/constants'
import { SpaceResource } from '../../../src/helpers'

describe('setNotice', () => {
  function setup() {
    const dav = mock<DAV>()
    dav.propPatch.mockResolvedValue(undefined)
    const { setNotice } = SetNoticeFactory(dav, { baseURI: '' })
    const space = mock<SpaceResource>({ webDavPath: '/dav/spaces/abc' })
    return { dav, setNotice, space }
  }

  it('sends a PROPPATCH with the notice value', async () => {
    const { dav, setNotice, space } = setup()
    await setNotice(space, { path: '/test.txt' }, 'hello')
    expect(dav.propPatch).toHaveBeenCalledWith(
      '/dav/spaces/abc/test.txt',
      { [DavProperty.Notice]: 'hello' },
      {}
    )
  })

  it('handles empty string', async () => {
    const { dav, setNotice, space } = setup()
    await setNotice(space, { path: '/doc.pdf' }, '')
    expect(dav.propPatch).toHaveBeenCalledWith(
      '/dav/spaces/abc/doc.pdf',
      { [DavProperty.Notice]: '' },
      {}
    )
  })

  it.each([
    { name: 'German umlauts', value: 'Ä Ö Ü ä ö ü ß' },
    { name: 'French accents', value: 'é è ê ë à â ç' },
    { name: 'Cyrillic', value: 'Привет мир' },
    { name: 'CJK characters', value: '你好世界 こんにちは' },
    { name: 'emoji', value: '📁 Aktenplan 🔒' },
    { name: 'XML special chars', value: '<script>alert("xss")</script> & "quotes"' },
    { name: 'newlines', value: 'line 1\nline 2\ttab' },
    { name: 'backslashes and paths', value: 'C:\\Users\\test\\file.txt' },
    { name: 'single quotes', value: "it's a test with 'quotes'" },
    { name: 'null-like strings', value: 'null undefined NaN' },
    { name: 'very long text', value: 'a'.repeat(1000) }
  ])('preserves special characters: $name', async ({ value }) => {
    const { dav, setNotice, space } = setup()
    await setNotice(space, { path: '/file.txt' }, value)
    expect(dav.propPatch).toHaveBeenCalledWith(
      '/dav/spaces/abc/file.txt',
      { [DavProperty.Notice]: value },
      {}
    )
  })
})
