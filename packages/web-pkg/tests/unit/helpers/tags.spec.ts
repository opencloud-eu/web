import { sortTags } from '../../../src/helpers'

describe('sortTags', () => {
  it('sorts case-insensitively and locale-aware', () => {
    expect(sortTags(['Zebra', 'apple', 'Äpfel', '10', 'banana'], 'de')).toEqual([
      '10',
      'Äpfel',
      'apple',
      'banana',
      'Zebra'
    ])
  })
  it('sorts numbers naturally', () => {
    expect(sortTags(['10', '2', '1'], 'en')).toEqual(['1', '2', '10'])
  })
  it('gives tags that compare equal a fixed order', () => {
    expect(sortTags(['work', 'Work'], 'en')).toEqual(['Work', 'work'])
    expect(sortTags(['Work', 'work'], 'en')).toEqual(['Work', 'work'])
  })
  it('handles language codes with region and empty language', () => {
    expect(sortTags(['b', 'A'], 'pt_BR')).toEqual(['A', 'b'])
    expect(sortTags(['b', 'A'], '')).toEqual(['A', 'b'])
  })
  it('does not mutate the input', () => {
    const tags = ['b', 'a']
    sortTags(tags, 'en')
    expect(tags).toEqual(['b', 'a'])
  })
})
