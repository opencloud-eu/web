import { loadReadingPosition, saveReadingPosition } from '../../../src/helpers/readingPosition'

describe('reading position', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('round trips the cfi per resource', () => {
    saveReadingPosition('file-1', 'epubcfi(/6/4!/4/2/1:0)')
    saveReadingPosition('file-2', 'epubcfi(/6/8!/4/2/1:0)')

    expect(loadReadingPosition('file-1')).toBe('epubcfi(/6/4!/4/2/1:0)')
    expect(loadReadingPosition('file-2')).toBe('epubcfi(/6/8!/4/2/1:0)')
    expect(loadReadingPosition('file-3')).toBeUndefined()
  })

  it('reads positions stored by earlier versions', () => {
    window.localStorage.setItem(
      'oc_epubReader_resource_file-1',
      JSON.stringify({ currentLocation: { start: { cfi: 'epubcfi(/6/4!/4/2/1:0)' } } })
    )

    expect(loadReadingPosition('file-1')).toBe('epubcfi(/6/4!/4/2/1:0)')
  })

  it('ignores unreadable values', () => {
    window.localStorage.setItem('oc_epubReader_resource_file-1', '{not json')

    expect(loadReadingPosition('file-1')).toBeUndefined()
  })
})
