import { escapeMarkdownBlockStarts } from '../../../../src/editor/extensions/markdownParagraph'

describe('escapeMarkdownBlockStarts', () => {
  it.each([
    ['- item', '\\- item'],
    ['+ item', '\\+ item'],
    ['-', '\\-'],
    ['1. item', '1\\. item'],
    ['1) item', '1\\) item'],
    ['a. item', 'a\\. item'],
    ['A) item', 'A\\) item'],
    ['iv. item', 'iv\\. item'],
    ['XII. item', 'XII\\. item'],
    ['# heading', '\\# heading'],
    ['######', '\\######'],
    ['---', '\\---'],
    ['- - -', '\\- - -'],
    ['===', '\\==='],
    ['  - indented', '\\- indented'],
    ['\tcode', 'code'],
    ['1234567890. long', '1234567890\\. long'],
    ['1.\u00a0Mai', '1\\.\u00a0Mai'],
    ['A.\u00a0Müller', 'A\\.\u00a0Müller'],
    ['-\u00a0item', '\\-\u00a0item'],
    ['#\u00a0heading', '\\#\u00a0heading'],
    ['\u00a01. item', '\u00a01\\. item']
  ])('escapes %j', (line, expected) => {
    expect(escapeMarkdownBlockStarts(line)).toBe(expected)
  })

  it.each([
    '#tag',
    '####### seven',
    'e.g. text',
    'abc. text',
    'a.',
    '-5',
    '+1',
    '1.5',
    '= sign',
    'text'
  ])('leaves %j as it is', (line) => {
    expect(escapeMarkdownBlockStarts(line)).toBe(line)
  })

  it('escapes every line', () => {
    expect(escapeMarkdownBlockStarts('a\n- b\n# c\n1. d')).toBe('a\n\\- b\n\\# c\n1\\. d')
  })

  it('escapes other ordered list markers only on the first line', () => {
    expect(escapeMarkdownBlockStarts('a\n2. b\nc. d\nIV. e')).toBe('a\n2. b\nc. d\nIV. e')
  })

  it('escapes other ordered list markers on every line in a list item', () => {
    expect(escapeMarkdownBlockStarts('a\n2. b\nc. d', true)).toBe('a\n2\\. b\nc\\. d')
  })
})
