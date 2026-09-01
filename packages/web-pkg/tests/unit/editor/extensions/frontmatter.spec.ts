import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import { GapCursor } from '@tiptap/pm/gapcursor'
import * as Y from 'yjs'
import { Collaboration } from '@tiptap/extension-collaboration'
import { DEFAULT_YDOC_FRAGMENT } from '../../../../src/editor/types'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { useStrategyMarkdown } from '../../../../src/editor/composables/strategies/markdown'
import type { TextEditorLinkPanelRequest, TextEditorState } from '../../../../src/editor/types'
import type { ContentTypeStrategy } from '../../../../src/editor/composables/strategies/types'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

function createStrategy(): ContentTypeStrategy {
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100)
  }
  return useStrategyMarkdown(state)
}

function createEditor(strategy: ContentTypeStrategy, content: string): Editor {
  return new Editor({
    extensions: strategy.extensions(),
    content: strategy.deserialize(content),
    contentType: 'markdown'
  })
}

function roundtrip(content: string): string {
  const strategy = createStrategy()
  const editor = createEditor(strategy, content)
  const markdown = strategy.serialize(editor.state.doc)
  editor.destroy()
  return markdown
}

// `editor.commands.keyboardShortcut()` replays only the captured steps, so a
// shortcut that merely moves the caret is dropped. Dispatch a real keydown the
// way the browser does instead.
function pressKey(editor: Editor, key: string, withMod = false): boolean {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: withMod,
    bubbles: true,
    cancelable: true
  })

  return (
    editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event) === true) ??
    false
  )
}

// Tiptap appends a trailing empty paragraph on the first transaction, which is
// unrelated to frontmatter and shows up as trailing newlines in the markdown.
function serializeBody(strategy: ContentTypeStrategy, editor: Editor): string {
  return strategy.serialize(editor.state.doc).trimEnd()
}

/** Node types of a live document, minus the trailing empty paragraph. */
function typesOf(editor: Editor): string[] {
  const types = editor.state.doc.children.map((node) => node.type.name)
  const last = editor.state.doc.lastChild

  return last?.type.name === 'paragraph' && last.content.size === 0 ? types.slice(0, -1) : types
}

function nodeTypes(content: string): string[] {
  const strategy = createStrategy()
  const editor = createEditor(strategy, content)
  const types = editor.state.doc.children.map((node) => node.type.name)
  editor.destroy()
  return types
}

describe('frontmatter', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  describe('parsing', () => {
    it('parses leading frontmatter into a single frontmatter node', () => {
      expect(nodeTypes('---\ntitle: My note\n---\n\n# Heading\n')).toEqual([
        'frontmatter',
        'heading'
      ])
    })

    it('keeps the raw frontmatter text verbatim', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\ntags:\n  - a\n  - b\n---\n\n# Heading\n')
      expect(editor.state.doc.firstChild?.textContent).toBe('tags:\n  - a\n  - b')
      editor.destroy()
    })

    it('keeps a thematic break inside the document a horizontal rule', () => {
      expect(nodeTypes('# Heading\n\n---\n\nSome text.\n')).toEqual([
        'heading',
        'horizontalRule',
        'paragraph'
      ])
    })

    it('keeps a thematic break at the start of the document a horizontal rule', () => {
      expect(nodeTypes('---\n\n# Heading\n')).toEqual(['horizontalRule', 'heading'])
    })

    it('does not parse frontmatter that starts below the first line', () => {
      expect(nodeTypes('# Heading\n\n---\ntitle: My note\n---\n')).not.toContain('frontmatter')
    })
  })

  describe('serialization', () => {
    it.each([
      ['single key', '---\ntitle: My note\n---\n\n# Heading\n\nSome text.'],
      ['nested keys', '---\ntitle: My note\ntags:\n  - a\n  - b\ndraft: true\n---\n\n# Heading'],
      ['without body', '---\ntitle: My note\n---'],
      ['empty', '---\n---\n\n# Heading']
    ])('round-trips frontmatter with %s', (_name, content) => {
      expect(roundtrip(content)).toBe(content)
    })

    it('leaves a document without frontmatter untouched', () => {
      const content = '# Heading\n\nSome text.'
      expect(roundtrip(content)).toBe(content)
    })
  })

  describe('editing', () => {
    it('allows typing inside the frontmatter block', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\ntitle: My note\n---\n\n# Heading')
      editor.commands.setTextSelection(1)
      editor.commands.insertContent('X')
      expect(serializeBody(strategy, editor)).toBe('---\nXtitle: My note\n---\n\n# Heading')
      editor.destroy()
    })

    it('keeps an emoji inserted into the metadata verbatim', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\ntitle: \n---\n\n# Heading')
      editor.commands.setTextSelection(8)
      editor.commands.insertContent('🚀')

      expect(editor.state.doc.firstChild?.textContent).toBe('title: 🚀')
      expect(serializeBody(strategy, editor)).toBe('---\ntitle: 🚀\n---\n\n# Heading')
      editor.destroy()
    })

    it('keeps typed frontmatter as plain text without marks', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\ntitle: My note\n---\n\n# Heading')
      editor.commands.setTextSelection({ from: 1, to: 6 })
      editor.commands.toggleBold()
      expect(serializeBody(strategy, editor)).toBe('---\ntitle: My note\n---\n\n# Heading')
      editor.destroy()
    })
  })

  describe('commands', () => {
    it('inserts an empty block at the top of the document', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '# Heading\n\nSome text.')

      expect(editor.commands.setFrontmatter()).toBe(true)
      expect(editor.state.doc.firstChild?.type.name).toBe('frontmatter')
      expect(editor.state.doc.firstChild?.textContent).toBe('')
      expect(serializeBody(strategy, editor)).toBe('---\n---\n\n# Heading\n\nSome text.')
      editor.destroy()
    })

    it('puts the caret inside the inserted block', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '# Heading')
      editor.commands.setFrontmatter()

      expect(editor.state.selection.$from.parent.type.name).toBe('frontmatter')
      editor.destroy()
    })

    it('does not insert a second block', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\ntitle: My note\n---\n\n# Heading')

      expect(editor.commands.setFrontmatter()).toBe(false)
      expect(serializeBody(strategy, editor)).toBe('---\ntitle: My note\n---\n\n# Heading')
      editor.destroy()
    })

    // Unwrapping drops the fences and keeps the metadata as content, so nothing
    // is lost and no confirmation is needed.
    it('unwraps a single key into a paragraph', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\ntitle: My note\n---\n\n# Heading')

      expect(editor.commands.unsetFrontmatter()).toBe(true)
      expect(typesOf(editor)).toEqual(['paragraph', 'heading'])
      expect(serializeBody(strategy, editor)).toBe('title: My note\n\n# Heading')
      editor.destroy()
    })

    it('unwraps multi line metadata into what it means as markdown', () => {
      const strategy = createStrategy()
      const editor = createEditor(
        strategy,
        '---\ntitle: My note\ntags:\n  - a\n  - b\n---\n\n# Heading'
      )

      expect(editor.commands.unsetFrontmatter()).toBe(true)
      expect(typesOf(editor)).toEqual(['paragraph', 'bulletList', 'heading'])
      expect(serializeBody(strategy, editor)).toBe('title: My note\ntags:\n\n- a\n- b\n\n# Heading')
      editor.destroy()
    })

    it('leaves a usable document when unwrapping an empty block', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\n---\n\n# Heading')

      expect(editor.commands.unsetFrontmatter()).toBe(true)
      expect(editor.state.doc.children.map((node) => node.type.name)).not.toContain('frontmatter')
      expect(serializeBody(strategy, editor)).toBe('# Heading')
      editor.destroy()
    })

    it('leaves a usable document when the block is all there is', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\n---')

      expect(editor.commands.unsetFrontmatter()).toBe(true)
      expect(editor.state.doc.childCount).toBeGreaterThan(0)
      expect(editor.state.doc.children.map((node) => node.type.name)).not.toContain('frontmatter')
      editor.destroy()
    })

    it('does not unwrap anything when there is no frontmatter', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '# Heading\n\nSome text.')

      expect(editor.commands.unsetFrontmatter()).toBe(false)
      expect(serializeBody(strategy, editor)).toBe('# Heading\n\nSome text.')
      editor.destroy()
    })

    it.each([
      ['without frontmatter', '# Heading', true, false],
      ['with frontmatter', '---\ntitle: My note\n---\n\n# Heading', false, true]
    ])('reports what it can do %s', (_name, content, canSet, canUnset) => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, content)

      expect(editor.can().setFrontmatter()).toBe(canSet)
      expect(editor.can().unsetFrontmatter()).toBe(canUnset)
      editor.destroy()
    })
  })

  // The frontmatter fences cannot be dissolved into prose, so the block boundary
  // must never be joined. Leaving those keys unhandled lets the browser delete
  // across the node view natively, which takes the whole block with it.
  describe('block boundary', () => {
    function boundaryEditor() {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\ntitle: My note\n---\n\n# Heading\n\nSome text.')
      const frontmatterSize = editor.state.doc.firstChild!.nodeSize

      return {
        strategy,
        editor,
        startOfFrontmatter: 1,
        endOfFrontmatter: frontmatterSize - 1,
        startOfBody: frontmatterSize + 1
      }
    }

    // The only way to sit in front of the very first block.
    function placeGapCursorAtStart(editor: Editor) {
      editor.view.dispatch(editor.state.tr.setSelection(new GapCursor(editor.state.doc.resolve(0))))
    }

    it.each([
      ['Backspace', false],
      ['Mod-Backspace', true]
    ])('moves the caret into the frontmatter on %s at the start of the body', (_name, withMod) => {
      const { strategy, editor, endOfFrontmatter, startOfBody } = boundaryEditor()
      editor.commands.setTextSelection(startOfBody)

      expect(pressKey(editor, 'Backspace', withMod)).toBe(true)
      expect(editor.state.selection.$from.parent.type.name).toBe('frontmatter')
      expect(editor.state.selection.from).toBe(endOfFrontmatter)
      expect(serializeBody(strategy, editor)).toBe(
        '---\ntitle: My note\n---\n\n# Heading\n\nSome text.'
      )
      editor.destroy()
    })

    it.each([
      ['Delete', false],
      ['Mod-Delete', true]
    ])('moves the caret into the frontmatter on %s in front of it', (_name, withMod) => {
      const { strategy, editor, startOfFrontmatter } = boundaryEditor()
      placeGapCursorAtStart(editor)

      expect(pressKey(editor, 'Delete', withMod)).toBe(true)
      expect(editor.state.selection.$from.parent.type.name).toBe('frontmatter')
      expect(editor.state.selection.from).toBe(startOfFrontmatter)
      expect(serializeBody(strategy, editor)).toBe(
        '---\ntitle: My note\n---\n\n# Heading\n\nSome text.'
      )
      editor.destroy()
    })

    it('moves the caret into the body on Delete at the end of the frontmatter', () => {
      const { strategy, editor, endOfFrontmatter, startOfBody } = boundaryEditor()
      editor.commands.setTextSelection(endOfFrontmatter)

      expect(pressKey(editor, 'Delete')).toBe(true)
      expect(editor.state.selection.$from.parent.type.name).toBe('heading')
      expect(editor.state.selection.from).toBe(startOfBody)
      expect(serializeBody(strategy, editor)).toBe(
        '---\ntitle: My note\n---\n\n# Heading\n\nSome text.'
      )
      editor.destroy()
    })

    // Away from the boundary the key must stay unhandled so the browser keeps
    // doing the ordinary character deletion.
    it('leaves Backspace to the browser inside the body', () => {
      const { editor, startOfBody } = boundaryEditor()
      editor.commands.setTextSelection(startOfBody + 1)

      expect(pressKey(editor, 'Backspace')).toBe(false)
      editor.destroy()
    })

    it('leaves Delete to the browser inside the frontmatter', () => {
      const { editor, endOfFrontmatter } = boundaryEditor()
      editor.commands.setTextSelection(endOfFrontmatter - 1)

      expect(pressKey(editor, 'Delete')).toBe(false)
      editor.destroy()
    })
  })

  // Source mode replaces the whole document on every keystroke, so a guard that
  // rejects transactions would silently discard everything the user types there.
  describe('document replacement', () => {
    function replaceContent(content: string, next: string) {
      const strategy = createStrategy()
      const editor = createEditor(strategy, content)
      editor.commands.setContent(next, { contentType: 'markdown', emitUpdate: true })
      const markdown = serializeBody(strategy, editor)
      editor.destroy()
      return markdown
    }

    it.each([
      ['edits the body', '---\ntitle: My note\n---\n\n# Changed'],
      ['edits the frontmatter', '---\ntitle: Changed\n---\n\n# Heading'],
      ['removes the frontmatter', '# Heading\n\nSome text.']
    ])('applies a replacement that %s', (_name, next) => {
      expect(replaceContent('---\ntitle: My note\n---\n\n# Heading', next)).toBe(next)
    })

    it('applies a replacement that breaks the opening fence', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\ntitle: My note\n---\n\n# Heading')
      editor.commands.setContent('X---\ntitle: My note\n---\n\n# Heading', {
        contentType: 'markdown',
        emitUpdate: true
      })
      expect(editor.state.doc.children.map((node) => node.type.name)).not.toContain('frontmatter')
      expect(editor.state.doc.textContent).toContain('X---')
      editor.destroy()
    })
  })

  // `group: 'block'` would let the `block+` half of the document content
  // expression match frontmatter too, so a second block could be pasted into the
  // body and would serialise to fences that re-lex as a rule plus a heading.
  describe('uniqueness', () => {
    const frontmatterHtml = '<pre data-frontmatter=""><code>title: B</code></pre>'

    it('is not part of the block group', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '# Heading')
      expect(editor.state.schema.nodes.frontmatter.spec.group).toBeUndefined()
      editor.destroy()
    })

    it('refuses a second block pasted into the body', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\ntitle: A\n---\n\n# Heading')
      editor.commands.setTextSelection(editor.state.doc.content.size - 1)
      editor.commands.insertContent(frontmatterHtml)

      expect(
        editor.state.doc.children.filter((node) => node.type.name === 'frontmatter')
      ).toHaveLength(1)
      expect(editor.state.doc.firstChild?.textContent).toBe('title: A')
      editor.destroy()
    })

    it('keeps a single block when content carries several', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '# Heading')
      editor.commands.setContent(
        `<pre data-frontmatter=""><code>title: A</code></pre><h1>H</h1>${frontmatterHtml}`,
        { contentType: 'html' }
      )

      expect(
        editor.state.doc.children.filter((node) => node.type.name === 'frontmatter')
      ).toHaveLength(1)
      editor.destroy()
    })
  })

  // Two peers can each add a frontmatter block before their edits meet. The CRDT
  // merges below the schema layer, so the result has to be checked, not assumed.
  describe('collaboration', () => {
    function boundEditor(strategy: ContentTypeStrategy, ydoc: Y.Doc): Editor {
      return new Editor({
        element: document.createElement('div'),
        extensions: [
          ...strategy.extensions({ yjs: true }),
          Collaboration.configure({ document: ydoc, field: DEFAULT_YDOC_FRAGMENT })
        ]
      })
    }

    function sync(from: Y.Doc, to: Y.Doc) {
      Y.applyUpdate(to, Y.encodeStateAsUpdate(from, Y.encodeStateVector(to)))
    }

    /** Two peers holding the same seed content, ready to diverge. */
    function peers(seed: string) {
      const strategy = createStrategy()
      const docA = new Y.Doc()
      const docB = new Y.Doc()
      const a = boundEditor(strategy, docA)
      a.commands.setContent(seed, { contentType: 'markdown' })
      sync(docA, docB)

      return {
        strategy,
        a,
        b: boundEditor(strategy, docB),
        reconnect: () => {
          sync(docA, docB)
          sync(docB, docA)
        }
      }
    }

    function frontmatterBlocks(editor: Editor) {
      return editor.state.doc.children.filter((node) => node.type.name === 'frontmatter')
    }

    it('converges on a single block when both peers add one', () => {
      const { strategy, a, b, reconnect } = peers('# Heading\n\nSome text.')
      a.commands.setFrontmatter()
      a.commands.insertContent('title: from A')
      b.commands.setFrontmatter()
      b.commands.insertContent('title: from B')

      reconnect()

      expect(frontmatterBlocks(a)).toHaveLength(1)
      expect(frontmatterBlocks(b)).toHaveLength(1)
      expect(strategy.serialize(a.state.doc)).toBe(strategy.serialize(b.state.doc))
      a.destroy()
      b.destroy()
    })

    // The losing block is demoted to a paragraph rather than dropped, so the
    // metadata stays visible in the document and the result survives a reload.
    it('keeps the losing metadata in the body and reloads unchanged', () => {
      const { strategy, a, b, reconnect } = peers('# Heading')
      a.commands.setFrontmatter()
      a.commands.insertContent('title: from A')
      b.commands.setFrontmatter()
      b.commands.insertContent('title: from B')

      reconnect()

      const merged = strategy.serialize(a.state.doc)
      expect(merged).toContain('title: from A')
      expect(merged).toContain('title: from B')

      const reloaded = createEditor(strategy, merged)
      expect(strategy.serialize(reloaded.state.doc)).toBe(merged)
      reloaded.destroy()
      a.destroy()
      b.destroy()
    })

    it('merges concurrent edits of the same metadata character by character', () => {
      const { strategy, a, b, reconnect } = peers('---\ntitle: \n---\n\n# Heading')
      a.commands.setTextSelection(8)
      a.commands.insertContent('A')
      b.commands.setTextSelection(8)
      b.commands.insertContent('B')

      reconnect()

      expect(frontmatterBlocks(a)).toHaveLength(1)
      expect(a.state.doc.firstChild?.textContent).toContain('A')
      expect(a.state.doc.firstChild?.textContent).toContain('B')
      expect(strategy.serialize(a.state.doc)).toBe(strategy.serialize(b.state.doc))
      a.destroy()
      b.destroy()
    })

    it('lets a removal win over a concurrent metadata edit', () => {
      const { strategy, a, b, reconnect } = peers('---\ntitle: keep\n---\n\n# Heading')
      a.commands.unsetFrontmatter()
      b.commands.setTextSelection(12)
      b.commands.insertContent('!')

      reconnect()

      expect(frontmatterBlocks(a)).toHaveLength(0)
      expect(strategy.serialize(a.state.doc)).toBe(strategy.serialize(b.state.doc))
      a.destroy()
      b.destroy()
    })
  })

  // Toolbar and slash entries are gated by the strategy, but extensions bind
  // their shortcuts straight into ProseMirror keymaps, so the keys stay live
  // regardless. Anything that restructures the block turns the metadata into
  // prose and loses the fences.
  describe('keyboard shortcuts', () => {
    /** Every shortcut the editor's extensions register, as far as they expose one. */
    function registeredShortcuts(editor: Editor): string[] {
      const keys = new Set<string>()

      for (const extension of editor.extensionManager.extensions) {
        const addKeyboardShortcuts = (extension.config as { addKeyboardShortcuts?: () => object })
          .addKeyboardShortcuts

        if (!addKeyboardShortcuts) {
          continue
        }

        try {
          const context = { editor, options: extension.options, name: extension.name }
          Object.keys(addKeyboardShortcuts.call(context)).forEach((key) => keys.add(key))
        } catch {
          // Some shortcuts need a node type we cannot build here, skip those.
        }
      }

      return [...keys].filter((key) => key.includes('-'))
    }

    it('leaves the block intact for every registered shortcut', () => {
      const strategy = createStrategy()
      const probe = createEditor(strategy, '---\na: 1\n---\n\n# Heading')
      const shortcuts = registeredShortcuts(probe)
      probe.destroy()

      expect(shortcuts.length).toBeGreaterThan(5)

      const damaged: string[] = []
      for (const shortcut of shortcuts) {
        const editor = createEditor(createStrategy(), '---\na: 1\n---\n\n# Heading')
        editor.commands.setTextSelection(2)
        editor.commands.keyboardShortcut(shortcut)

        const first = editor.state.doc.firstChild
        if (first?.type.name !== 'frontmatter' || first.textContent !== 'a: 1') {
          damaged.push(`${shortcut} -> ${first?.type.name}`)
        }
        editor.destroy()
      }

      expect(damaged).toEqual([])
    })

    it('still applies shortcuts outside the block', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\na: 1\n---\n\nplain')
      editor.commands.setTextSelection(editor.state.doc.content.size - 2)
      editor.commands.keyboardShortcut('Mod-Alt-1')

      expect(serializeBody(strategy, editor)).toContain('# plain')
      editor.destroy()
    })
  })

  // Content reaches the block through more than the keyboard. These pin the
  // schema level protections that keep the other routes harmless: `text*` and
  // `marks: ''` admit nothing but plain text, and `code: true` stops input rules
  // from firing inside it.
  describe('other input paths', () => {
    function editorWithCaretInMetadata() {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\na: 1\n---\n\n# Heading')
      editor.commands.setTextSelection(2)

      return { strategy, editor }
    }

    it.each(['# ', '## ', '- ', '1. ', '> ', '```', '[ ] '])(
      'types %j literally instead of running the input rule',
      (typed) => {
        const strategy = createStrategy()
        const editor = createEditor(strategy, '---\na: 1\n---\n\n# Heading')
        editor.commands.insertContentAt(1, typed, { applyInputRules: true })

        expect(editor.state.doc.firstChild?.type.name).toBe('frontmatter')
        expect(editor.state.doc.firstChild?.textContent).toBe(`${typed}a: 1`)
        editor.destroy()
      }
    )

    it.each([
      ['a heading', '<h1>x</h1>'],
      ['a list', '<ul><li>x</li></ul>'],
      ['a quote', '<blockquote><p>x</p></blockquote>'],
      ['a table', '<table><tr><td>x</td></tr></table>'],
      ['an image', '<img src="data:image/png;base64,iVBORw0KGgo=" />']
    ])('keeps the block plain text when pasting %s', (_name, html) => {
      const { editor } = editorWithCaretInMetadata()
      editor.commands.insertContent(html)

      expect(editor.state.doc.firstChild?.type.name).toBe('frontmatter')
      expect(() => editor.state.doc.check()).not.toThrow()
      editor.destroy()
    })

    // The image file handler inserts at the drop position, which can land here.
    it('refuses an image dropped onto the block', () => {
      const { strategy, editor } = editorWithCaretInMetadata()
      editor
        .chain()
        .insertContentAt(2, { type: 'image', attrs: { src: 'data:image/png;base64,x' } })
        .run()

      expect(editor.state.doc.firstChild?.childCount).toBe(1)
      expect(editor.state.doc.firstChild?.textContent).toBe('a: 1')
      expect(serializeBody(strategy, editor)).toBe('---\na: 1\n---\n\n# Heading')
      editor.destroy()
    })
  })

  // marked lexes the inside of a blockquote or list item with a fresh token
  // array, so "nothing tokenized yet" is true in there too. A frontmatter node
  // in a container is schema invalid, and whatever prunes it later takes the
  // surrounding content with it.
  describe('nested containers', () => {
    function frontmatterNodes(editor: Editor) {
      const found: string[] = []
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'frontmatter') {
          found.push(node.textContent)
        }
        return true
      })

      return found
    }

    it.each([
      ['blockquote', '> ---\n> a: 1\n> ---\n\nFoo'],
      ['list item', '- ---\n  a: 1\n  ---\n\nFoo']
    ])('does not read fences inside a %s as frontmatter', (_name, content) => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, content)

      expect(frontmatterNodes(editor)).toEqual([])
      expect(editor.state.doc.textContent).toContain('Foo')
      expect(editor.state.doc.textContent).toContain('a: 1')
      editor.destroy()
    })

    // A node the schema does not allow survives `Node.fromJSON`, which does not
    // validate, and is only destroyed later by a path that does. Checking the
    // document catches it at the source instead of via one of its symptoms.
    it('produces a document that satisfies the schema', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '> ---\n> a: 1\n> ---\n\nFoo')

      expect(() => editor.state.doc.check()).not.toThrow()
      editor.destroy()
    })

    it('still reads fences at the top of the document as frontmatter', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '---\na: 1\n---\n\nFoo')

      expect(frontmatterNodes(editor)).toEqual(['a: 1'])
      editor.destroy()
    })
  })

  describe('schema', () => {
    // A document may legitimately hold nothing but metadata. `frontmatter? block+`
    // would demand a block after it, and the resulting invalid document is only
    // destroyed later, by whichever path enforces the schema first.
    it.each([
      ['metadata only', '---\na: 1\n---'],
      ['empty metadata only', '---\n---'],
      ['metadata and body', '---\na: 1\n---\n\n# Heading'],
      ['body only', '# Heading']
    ])('accepts a document with %s', (_name, content) => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, content)

      expect(() => editor.state.doc.check()).not.toThrow()
      editor.destroy()
    })

    it('allows frontmatter only as the first block', () => {
      const strategy = createStrategy()
      const editor = createEditor(strategy, '# Heading\n')
      expect(editor.state.schema.nodes.doc.spec.content).toBe('block+ | (frontmatter block*)')
      editor.destroy()
    })
  })
})
