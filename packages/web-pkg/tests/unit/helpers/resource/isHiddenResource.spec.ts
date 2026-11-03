import { isHiddenResource } from '../../../../src'

describe('isHiddenResource', () => {
  it.each([
    { name: 'file.txt', path: '/file.txt', expected: false },
    { name: 'file.txt', path: '/folder/sub/file.txt', expected: false },
    { name: 'file.txt', path: undefined, expected: false },
    { name: '.file.txt', path: '/.file.txt', expected: true },
    { name: '.hidden', path: undefined, expected: true },
    { name: 'inside.txt', path: '/.hidden/inside.txt', expected: true },
    { name: 'inside.txt', path: '/folder/.hidden/sub/inside.txt', expected: true }
  ])('returns $expected for path "$path" and name "$name"', ({ name, path, expected }) => {
    expect(isHiddenResource({ name, path })).toBe(expected)
  })
})
