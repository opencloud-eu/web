import { defineComponent } from 'vue'
import type { Resource } from '@opencloud-eu/web-client'
import {
  matchesMimePattern,
  resolveResourceEditor
} from '../../../../src/components/AppTemplates/resolveResourceEditor'
import type {
  ResourceEditorComponent,
  ResourceEditorExtension
} from '../../../../src/composables/piniaStores'

const stubComponent = defineComponent({
  template: '<div/>'
}) as unknown as ResourceEditorComponent

const ext = (overrides: Partial<ResourceEditorExtension>): ResourceEditorExtension => ({
  id: overrides.id ?? 'app.test',
  type: 'resourceEditor',
  appId: overrides.appId ?? 'test',
  component: stubComponent,
  ...overrides
})

const resource = (overrides: Partial<Resource> = {}): Resource =>
  ({ id: 'r1', name: 'doc', ...overrides }) as Resource

describe('matchesMimePattern', () => {
  it.each([
    ['text/plain', 'text/plain', true],
    ['text/plain', 'text/*', true],
    ['text/markdown', 'text/*', true],
    ['image/png', 'text/*', false],
    ['application/pdf', 'application/pdf', true],
    ['application/pdf', 'application/*', true],
    ['text/plain', 'text/markdown', false]
  ])('matches %j against %j → %s', (mime, pattern, expected) => {
    expect(matchesMimePattern(mime, pattern)).toBe(expected)
  })
})

describe('resolveResourceEditor', () => {
  it('returns undefined when no candidate matches', () => {
    const editors = [ext({ id: 'a', extensions: ['md'] })]
    expect(resolveResourceEditor(resource({ extension: 'pdf' }), editors)).toBeUndefined()
  })

  it('matches by exact file extension', () => {
    const md = ext({ id: 'a', extensions: ['md'] })
    const pdf = ext({ id: 'b', extensions: ['pdf'] })
    expect(resolveResourceEditor(resource({ extension: 'pdf' }), [md, pdf])).toBe(pdf)
  })

  it('matches by exact mime type', () => {
    const png = ext({ id: 'a', mimeTypes: ['image/png'] })
    expect(resolveResourceEditor(resource({ mimeType: 'image/png' }), [png])).toBe(png)
  })

  it('matches by mime glob (`family/*`)', () => {
    const text = ext({ id: 'a', mimeTypes: ['text/*'] })
    expect(resolveResourceEditor(resource({ mimeType: 'text/markdown' }), [text])).toBe(text)
  })

  it('honours a custom matches() predicate', () => {
    const custom = ext({
      id: 'a',
      matches: (r) => r.name === 'special.x'
    })
    expect(resolveResourceEditor(resource({ name: 'special.x' }), [custom])).toBe(custom)
    expect(resolveResourceEditor(resource({ name: 'other' }), [custom])).toBeUndefined()
  })

  it('prefers a hasPriority candidate among multiple matches', () => {
    const fallback = ext({ id: 'a', extensions: ['md'] })
    const priority = ext({ id: 'b', extensions: ['md'], hasPriority: true })
    // Order in the list should not matter.
    expect(resolveResourceEditor(resource({ extension: 'md' }), [fallback, priority])).toBe(
      priority
    )
    expect(resolveResourceEditor(resource({ extension: 'md' }), [priority, fallback])).toBe(
      priority
    )
  })

  it('falls back to the first match when no candidate has priority', () => {
    const a = ext({ id: 'a', extensions: ['md'] })
    const b = ext({ id: 'b', extensions: ['md'] })
    expect(resolveResourceEditor(resource({ extension: 'md' }), [a, b])).toBe(a)
  })

  it('lower-cases extension and mime before matching', () => {
    const text = ext({ id: 'a', extensions: ['md'], mimeTypes: ['text/*'] })
    expect(resolveResourceEditor(resource({ extension: 'MD' }), [text])).toBe(text)
    expect(resolveResourceEditor(resource({ mimeType: 'TEXT/MARKDOWN' }), [text])).toBe(text)
  })
})
