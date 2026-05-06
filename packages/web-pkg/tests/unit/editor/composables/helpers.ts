import { vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { createGettext } from 'vue3-gettext'
import type { Editor } from '@tiptap/vue-3'

export function withSetup<T>(composable: () => T): { result: T } {
  let result!: T
  const app = createApp(
    defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      }
    })
  )
  app.use(createGettext({ translations: {}, silent: true }))
  app.mount(document.createElement('div'))
  return { result }
}

interface MockEditorOptions {
  isActive?: (type: string, attrs?: Record<string, unknown>) => boolean
  canUndo?: boolean
  canRedo?: boolean
  attributes?: Record<string, Record<string, unknown>>
  runResult?: boolean
}

export function createMockEditor(options: MockEditorOptions = {}) {
  const {
    isActive = () => false,
    canUndo = false,
    canRedo = false,
    attributes = {},
    runResult = true
  } = options

  const run = vi.fn().mockReturnValue(runResult)

  function createChain() {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    const methods = [
      'focus',
      'undo',
      'redo',
      'toggleBold',
      'toggleItalic',
      'toggleUnderline',
      'toggleStrike',
      'toggleCode',
      'setParagraph',
      'setNode',
      'toggleHeading',
      'toggleBlockquote',
      'toggleCodeBlock',
      'setHorizontalRule',
      'toggleBulletList',
      'toggleOrderedList',
      'toggleTaskList',
      'deleteRange',
      'deleteRow',
      'deleteTable',
      'deleteColumn',
      'insertTable',
      'setFontFamily',
      'setFontSize',
      'setLineHeight',
      'setColor',
      'setBackgroundColor',
      'addRowBefore',
      'addRowAfter',
      'addColumnBefore',
      'addColumnAfter',
      'setImage'
    ]
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain)
    }
    chain.run = run
    return chain
  }

  const chainInstance = createChain()

  return {
    chain: vi.fn(() => chainInstance),
    isActive: vi.fn(isActive),
    can: vi.fn(() => ({
      undo: vi.fn().mockReturnValue(canUndo),
      redo: vi.fn().mockReturnValue(canRedo)
    })),
    getAttributes: vi.fn((mark: string) => attributes[mark] ?? {}),
    _chain: chainInstance,
    _run: run
  } as unknown as Editor & {
    _chain: Record<string, ReturnType<typeof vi.fn>>
    _run: ReturnType<typeof vi.fn>
  }
}
