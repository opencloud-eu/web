import { basename, dirname } from '../../../src/utils/path'

describe('dirname', () => {
  it.each([
    ['', '.'],
    ['/', '/'],
    ['//', '/'],
    ['.', '.'],
    ['file.txt', '.'],
    ['folder/', '.'],
    ['/file.txt', '/'],
    ['/folder/', '/'],
    ['/folder/file.txt', '/folder'],
    ['/folder/sub/', '/folder'],
    ['/folder/sub//', '/folder'],
    ['/folder//sub', '/folder/'],
    ['/folder//sub/file.txt', '/folder//sub'],
    ['folder/sub/file.txt', 'folder/sub'],
    ['folder//file.txt', 'folder/'],
    ['/my folder/my file.tar.gz', '/my folder'],
    ['/.hidden/.env', '/.hidden'],
    ['/spaces/id!id/folder', '/spaces/id!id']
  ])('returns the parent of "%s" as "%s"', (path, expected) => {
    expect(dirname(path)).toBe(expected)
  })
})

describe('basename', () => {
  it.each([
    ['', ''],
    ['/', ''],
    ['//', ''],
    ['.', '.'],
    ['file.txt', 'file.txt'],
    ['/file.txt', 'file.txt'],
    ['/folder/', 'folder'],
    ['/folder/sub//', 'sub'],
    ['/folder/file.txt', 'file.txt'],
    ['/my folder/my file.tar.gz', 'my file.tar.gz'],
    ['/folder/.env', '.env'],
    ['/folder/name.', 'name.']
  ])('returns the last segment of "%s" as "%s"', (path, expected) => {
    expect(basename(path)).toBe(expected)
  })
})
