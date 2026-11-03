import { mock } from 'vitest-mock-extended'
import type { Resource } from '@opencloud-eu/web-client'
import { isResourceSupportedByFileExtension } from '../../../src/apps'

function resource(data: Partial<Resource>) {
  return mock<Resource>({ extension: undefined, mimeType: undefined, isFolder: false, ...data })
}

describe('isResourceSupportedByFileExtension', () => {
  it.each([
    { name: 'same extension', ext: 'pdf', registered: 'pdf', expected: true },
    { name: 'extension in another case', ext: 'PDF', registered: 'pdf', expected: true },
    { name: 'other extension', ext: 'html', registered: 'pdf', expected: false }
  ])('matches by extension: $name', ({ ext, registered, expected }) => {
    expect(
      isResourceSupportedByFileExtension(resource({ extension: ext }), { extension: registered })
    ).toBe(expected)
  })

  it.each([
    { name: 'same mime type', mimeType: 'image/png', registered: 'image/png', expected: true },
    { name: 'mime type family', mimeType: 'image/png', registered: 'image', expected: true },
    { name: 'other mime type', mimeType: 'text/html', registered: 'image/png', expected: false },
    { name: 'other family', mimeType: 'text/html', registered: 'image', expected: false }
  ])('matches by mime type: $name', ({ mimeType, registered, expected }) => {
    expect(
      isResourceSupportedByFileExtension(resource({ mimeType }), { mimeType: registered })
    ).toBe(expected)
  })

  it('prefers the extension over the mime type', () => {
    expect(
      isResourceSupportedByFileExtension(
        resource({ extension: 'html', mimeType: 'application/pdf' }),
        { extension: 'pdf', mimeType: 'application/pdf' }
      )
    ).toBe(false)
  })

  it('does not match when neither extension nor mime type can be compared', () => {
    expect(
      isResourceSupportedByFileExtension(resource({ extension: 'pdf' }), {
        mimeType: 'application/pdf'
      })
    ).toBe(false)
  })

  it.each([
    { name: 'file for file registration', isFolder: false, type: undefined, expected: true },
    { name: 'file for explicit file registration', isFolder: false, type: 'file', expected: true },
    { name: 'folder for folder registration', isFolder: true, type: 'folder', expected: true },
    { name: 'folder for file registration', isFolder: true, type: undefined, expected: false },
    { name: 'file for folder registration', isFolder: false, type: 'folder', expected: false }
  ] as const)('matches the resource kind: $name', ({ isFolder, type, expected }) => {
    expect(
      isResourceSupportedByFileExtension(resource({ extension: 'txt', isFolder }), {
        extension: 'txt',
        type
      })
    ).toBe(expected)
  })

  it('respects canOpen', () => {
    const file = resource({ extension: 'png' })
    const canOpen = vi.fn().mockReturnValue(false)

    expect(isResourceSupportedByFileExtension(file, { extension: 'png', canOpen })).toBe(false)
    expect(canOpen).toHaveBeenCalledWith(file)
  })
})
