import { hasExtension, withExtension, withoutExtension } from '../../../src/helpers/fileExtension'

describe('hasExtension', () => {
  it('detects the given extension', () => {
    expect(hasExtension('notes.md', 'md')).toBe(true)
    expect(hasExtension('notes', 'md')).toBe(false)
  })

  it('does not take one extension for another', () => {
    expect(hasExtension('notes.md', 'txt')).toBe(false)
  })

  it('handles a missing name', () => {
    expect(hasExtension(undefined, 'md')).toBe(false)
  })
})

describe('withExtension', () => {
  it('appends the given extension', () => {
    expect(withExtension('Project archive', 'vault')).toBe('Project archive.vault')
    expect(withExtension('Project archive', 'crypt')).toBe('Project archive.crypt')
  })

  it('does not stack extensions when the name already carries one', () => {
    expect(withExtension('notes.md', 'md')).toBe('notes.md')
  })
})

describe('withoutExtension', () => {
  it('strips the given extension', () => {
    expect(withoutExtension('Project archive.vault', 'vault')).toBe('Project archive')
  })

  it('leaves a name without that extension alone', () => {
    expect(withoutExtension('Project archive', 'vault')).toBe('Project archive')
    expect(withoutExtension('notes.md', 'txt')).toBe('notes.md')
  })
})
