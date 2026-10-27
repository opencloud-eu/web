import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import type { Editor } from '@tiptap/vue-3'
import {
  createEditor,
  createStrategy,
  destroyEditors,
  expectStableRoundtrip,
  load,
  toJSON
} from './helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

describe('markdown raw html roundtrip', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  afterEach(() => {
    destroyEditors()
  })

  describe('raw html', () => {
    it.each([
      '<div align="center">centered</div>',
      '<!-- hidden comment -->',
      '<details>\n<summary>More</summary>\n\nHidden **content**\n\n</details>',
      'Para <kbd>K</kbd> and x<sup>2</sup> end.',
      'Text <!-- comment --> more',
      '**bold <kbd>K</kbd> bold**',
      '> <div>\n> quoted\n> </div>',
      '<img src="logo.png" alt="Logo" align="right">',
      'See <a\n   href="https://x.y">here</a>.',
      '<img\n  src="a.png"\n  width="100">',
      '<img src="a.png" alt="say &quot;hi&quot;" width="100">'
    ])('saves %j unchanged', (markdown) => {
      const { serialized, reserialized } = expectStableRoundtrip(markdown)
      expect(serialized).toBe(markdown)
      expect(reserialized).toBe(markdown)
    })

    it('shows the html source', () => {
      const { editor } = load('<div>block</div>\n\nPara <kbd>K</kbd>')
      expect(editor.getText({ blockSeparator: '\n' })).toBe('<div>block</div>\nPara <kbd>K</kbd>')
    })

    it('still parses the resized images the editor writes', () => {
      const { editor, serialized } = load(
        '<img src="a.png" alt="x" title="t" width="100" height="50" />'
      )
      expect(editor.getJSON().content?.[0]).toMatchObject({
        type: 'image',
        attrs: { src: 'a.png', alt: 'x', title: 't', width: 100, height: 50 }
      })
      expect(serialized).toBe('<img src="a.png" alt="x" title="t" width="100" height="50" />')
    })

    it('still parses resized images with a bare ampersand', () => {
      const markdown = '<img src="a.png?x=1&y=2" alt="Tom & Jerry" width="120" />'
      const { editor, serialized } = expectStableRoundtrip(markdown)
      expect(editor.getJSON().content?.[0]).toMatchObject({
        type: 'image',
        attrs: { src: 'a.png?x=1&y=2', alt: 'Tom & Jerry', width: 120 }
      })
      expect(serialized).toBe(markdown)
    })

    it('still parses the line breaks the editor writes into table cells', () => {
      const { editor, serialized } = expectStableRoundtrip('| a | b |\n| - | - |\n| c<br>e | d |')
      expect(toJSON(editor).content[0].content[1].content[0]).toMatchObject({
        type: 'tableCell',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'c' },
              { type: 'hardBreak' },
              { type: 'text', text: 'e' }
            ]
          }
        ]
      })
      expect(serialized).toContain('| c<br>e |')
    })

    it('reads text after an unclosed inline tag as markdown', () => {
      const { editor, serialized } = load('Press <kbd> to start\n\n# Next &copy; *a*')
      expect(editor.getJSON().content?.[1]).toMatchObject({
        type: 'heading',
        content: [
          { type: 'text', text: 'Next © ' },
          { type: 'text', text: 'a', marks: [{ type: 'italic' }] }
        ]
      })
      expect(serialized).toBe('Press <kbd> to start\n\n# Next © *a*')
    })

    it('escapes text typed after inline html', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, 'Para <kbd>K</kbd>')
      editor.commands.insertContentAt(editor.state.doc.content.size - 1, {
        type: 'text',
        text: ' <b>'
      })
      expect(strategy.serialize(editor.state.doc)).toBe('Para <kbd>K</kbd> &lt;b>')
    })

    it('saves text typed into an html block as html', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '<div>a</div>\n\nend')
      editor.commands.insertContentAt(editor.state.doc.firstChild.nodeSize - 1, {
        type: 'text',
        text: '<b>b</b>'
      })
      expect(strategy.serialize(editor.state.doc)).toBe('<div>a</div><b>b</b>\n\nend')
    })

    it.each([
      ['the start of an html block', 'para\n\n<div align="center">x</div>\n\nend'],
      ['the start of a paragraph after an html block', '<div>x</div>\n\na &lt;b **bold**\n\nend']
    ])('keeps blocks apart on Backspace at %s', (_name, markdown) => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, markdown)
      editor.commands.setTextSelection(editor.state.doc.firstChild.nodeSize + 1)
      editor.commands.keyboardShortcut('Backspace')
      expect(strategy.serialize(editor.state.doc)).toBe(markdown)
    })

    describe('exiting an html block', () => {
      function editorAtEndOfHtmlBlock() {
        const editor = createEditor(createStrategy(), '<div>a</div>\n\n# Heading')
        editor.commands.setTextSelection(editor.state.doc.firstChild.nodeSize - 1)
        return editor
      }

      // `keyboardShortcut()` drops the selection change, dispatch a real keydown instead
      function pressEnter(editor: Editor, shiftKey = false) {
        const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey, cancelable: true })
        editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event))
      }

      function typesOf(editor: Editor) {
        return toJSON(editor).content?.map(({ type }) => type)
      }

      it('exits on Shift+Enter', () => {
        const editor = editorAtEndOfHtmlBlock()
        pressEnter(editor, true)
        expect(editor.state.doc.firstChild.textContent).toBe('<div>a</div>')
        expect(editor.state.selection.$from.parent.type.name).toBe('paragraph')
        expect(typesOf(editor).slice(0, 3)).toEqual(['htmlBlock', 'paragraph', 'heading'])
      })

      it('drops the two typed blank lines and exits on the third Enter', () => {
        const editor = editorAtEndOfHtmlBlock()
        pressEnter(editor)
        pressEnter(editor)
        expect(editor.state.doc.firstChild.textContent).toBe('<div>a</div>\n\n')
        expect(editor.state.selection.$from.parent.type.name).toBe('htmlBlock')

        pressEnter(editor)
        expect(editor.state.doc.firstChild.textContent).toBe('<div>a</div>')
        expect(editor.state.selection.$from.parent.type.name).toBe('paragraph')
        expect(typesOf(editor).slice(0, 3)).toEqual(['htmlBlock', 'paragraph', 'heading'])
      })
    })
  })

  describe('html entities', () => {
    it('decodes named entities', () => {
      const { editor, serialized } = load('a&nbsp;b &copy; &mdash; &euro; &hellip;')
      expect(editor.getText()).toBe('a b © — € …')
      expect(serialized).toBe('a b © — € …')
    })

    it.each([
      ['&amp;nbsp;', '&nbsp;'],
      ['&amp;copy;', '&copy;'],
      ['&lt;b&gt;', '<b>'],
      ['&#169;', '©'],
      ['&unknown;', '&unknown;'],
      ['&AMP;lt;', '&lt;']
    ])('reads %j as %j', (markdown, text) => {
      expect(load(markdown).editor.getText()).toBe(text)
    })

    it.each(['&noti;', '&copyright;', '&ltfoo;', '&ampersand;'])(
      'keeps the unknown name %j',
      (markdown) => {
        const { editor, serialized } = load(markdown)
        expect(editor.getText()).toBe(markdown)
        expect(serialized).toBe(markdown.replace('&', '&amp;'))
      }
    )

    it('leaves entities in code alone', () => {
      expect(load('`&copy;`').editor.getText()).toBe('&copy;')
      expect(load('```\n&copy;\n```').editor.getText()).toBe('&copy;')
    })
  })

  describe('when rendering html', () => {
    function render(markdown: string) {
      const strategy = createStrategy({ renderHtml: true })
      return createEditor(strategy, markdown).getJSON().content
    }

    it('parses html through the editor schema', () => {
      expect(render('line<br>\nnext <u>under</u>')).toEqual([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'line' },
            { type: 'hardBreak' },
            { type: 'text', text: '\nnext ' },
            { type: 'text', text: 'under', marks: [{ type: 'underline' }] }
          ]
        }
      ])
    })

    it('still decodes named entities', () => {
      expect(render('&copy;')).toEqual([
        { type: 'paragraph', content: [{ type: 'text', text: '©' }] }
      ])
    })
  })
})
