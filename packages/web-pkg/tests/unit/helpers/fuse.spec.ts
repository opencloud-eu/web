import Fuse from 'fuse.js'
import { defaultFuseOptions, escapeFuseQuery } from '../../../src/helpers/fuse'

const names = [
  'x-!bang',
  'x-price$',
  'x-^caret',
  'x-=equal',
  "x-'quote",
  'x-a|b',
  'x-"dq"',
  'x-plain'
]

function search(term: string) {
  const fuse = new Fuse(
    names.map((name) => ({ name })),
    { ...defaultFuseOptions, keys: ['name'] }
  )
  return fuse.search(escapeFuseQuery(term)).map((r) => r.item.name)
}

describe('escapeFuseQuery', () => {
  it.each([
    ['!bang', ['x-!bang']],
    ['price$', ['x-price$']],
    ['x-price$', ['x-price$']],
    ['^caret', ['x-^caret']],
    ['=equal', ['x-=equal']],
    ["'quote", ["x-'quote"]],
    ['a|b', ['x-a|b']],
    ['"dq"', ['x-"dq"']],
    ['"', ['x-"dq"']],
    ['PLAIN', ['x-plain']]
  ])('matches "%s" literally', (term, expected) => {
    expect(search(term)).toEqual(expected)
  })

  it('combines words with AND regardless of their order', () => {
    expect(search('plain x-')).toEqual(['x-plain'])
    expect(search('plain bang')).toEqual([])
  })

  it('ignores surrounding and repeated whitespace', () => {
    expect(search('  plain   x- ')).toEqual(['x-plain'])
    expect(escapeFuseQuery('   ')).toBe('')
  })
})
