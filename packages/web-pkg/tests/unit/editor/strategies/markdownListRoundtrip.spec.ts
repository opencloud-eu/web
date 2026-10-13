import { Marked } from 'marked'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { registerMarkdownListTokenizer } from '../../../../src/editor/extensions'
import { load, destroyEditors } from './helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

describe('markdown list roundtrip', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  afterEach(() => {
    destroyEditors()
  })

  describe('list items', () => {
    it('parses many lists starting with an empty item in linear time', () => {
      const start = performance.now()
      load('- \n- x\n# h\n'.repeat(30) + '- \n- x\n\n1. \n2. y\n\n'.repeat(30))

      expect(performance.now() - start).toBeLessThan(1000)
    })

    it('parses many ordered lists with under indented content in linear time', () => {
      const start = performance.now()
      load('1. a\n  - b\n\nc\n\n'.repeat(300))

      expect(performance.now() - start).toBeLessThan(1000)
    })

    it.each([
      '1. a\n1) b\n',
      '1. # a\nb\n',
      '1. #1 a\nb\n',
      '1. ***\nb\n',
      '1. a\n   b\n\n  c\n\n',
      '1. a\n___\n'
    ])('lexes many ordered lists %j in linear time', (list) => {
      const marked = new Marked()
      registerMarkdownListTokenizer(marked)
      const start = performance.now()
      marked.lexer(list.repeat(10000))

      expect(performance.now() - start).toBeLessThan(1000)
    })
  })
})
