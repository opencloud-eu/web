import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { ref } from 'vue'
import * as Y from 'yjs'
import type { Resource } from '@opencloud-eu/web-client'
import type { YjsAdapter } from '@opencloud-eu/web-pkg'
import { detectContentType, makeTextEditorAdapter } from '../../src/yjs'

describe('detectContentType', () => {
  it.each([
    ['md', 'text/plain', 'markdown'],
    ['markdown', 'text/plain', 'markdown'],
    ['ocnote', 'application/json', 'tiptap-json'],
    ['txt', 'text/markdown', 'markdown'],
    ['txt', 'text/plain', 'plain-text'],
    ['ts', 'text/plain', 'plain-text']
  ])('maps extension "%s" / mime "%s" to %s', (extension, mimeType, expected) => {
    expect(detectContentType(mock<Resource>({ extension, mimeType }))).toBe(expected)
  })
})

describe('makeTextEditorAdapter', () => {
  function buildAdapter(resource: Resource) {
    let adapter: YjsAdapter
    const wrapper = getComposableWrapper(() => {
      adapter = makeTextEditorAdapter({ resource: ref(resource) })
    })
    return {
      wrapper,
      get adapter() {
        return adapter
      }
    }
  }

  it('hydrates markdown into the shared fragment and serializes it back', () => {
    const { adapter } = buildAdapter(mock<Resource>({ extension: 'md', mimeType: 'text/markdown' }))
    const ydoc = new Y.Doc()

    expect(adapter.hasContent(ydoc)).toBe(false)
    adapter.hydrate(ydoc, '# Title')
    expect(adapter.hasContent(ydoc)).toBe(true)
    expect(adapter.serialize(ydoc)).toContain('# Title')
  })

  it('resets the shared fragment', () => {
    const { adapter } = buildAdapter(mock<Resource>({ extension: 'md', mimeType: 'text/markdown' }))
    const ydoc = new Y.Doc()
    adapter.hydrate(ydoc, 'content')
    adapter.reset!(ydoc)
    expect(adapter.hasContent(ydoc)).toBe(false)
  })

  it('is a no-op when hydrating with empty content', () => {
    const { adapter } = buildAdapter(mock<Resource>({ extension: 'txt', mimeType: 'text/plain' }))
    const ydoc = new Y.Doc()
    adapter.hydrate(ydoc, '')
    expect(adapter.hasContent(ydoc)).toBe(false)
  })
})
