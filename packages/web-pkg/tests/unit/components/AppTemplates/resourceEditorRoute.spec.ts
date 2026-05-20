import { defineComponent } from 'vue'
import { resourceEditorRoute } from '../../../../src/components/AppTemplates/resourceEditorRoute'
import type { ResourceEditorExtension } from '../../../../src/composables/piniaStores'

const buildExtension = (
  overrides: Partial<ResourceEditorExtension> = {}
): ResourceEditorExtension => ({
  id: 'app.test',
  type: 'resourceEditor',
  appId: 'test-app',
  component: defineComponent({ template: '<div/>' }),
  ...overrides
})

describe('resourceEditorRoute', () => {
  it('falls back to extension.appId for the route name', () => {
    const route = resourceEditorRoute({ extension: buildExtension() })
    expect(route.name).toBe('test-app')
  })

  it('uses the standard driveAliasAndItem path by default', () => {
    const route = resourceEditorRoute({ extension: buildExtension() })
    expect(route.path).toBe('/:driveAliasAndItem(.*)?')
  })

  it('sets authContext=hybrid and patchCleanPath=true on meta by default', () => {
    const route = resourceEditorRoute({ extension: buildExtension() })
    expect(route.meta).toMatchObject({ authContext: 'hybrid', patchCleanPath: true })
  })

  it('lets callers override name, path, authContext and extra meta', () => {
    const route = resourceEditorRoute({
      extension: buildExtension(),
      name: 'custom-name',
      path: '/custom',
      authContext: 'anonymous',
      meta: { title: 'Custom title' }
    })
    expect(route.name).toBe('custom-name')
    expect(route.path).toBe('/custom')
    expect(route.meta).toMatchObject({
      authContext: 'anonymous',
      patchCleanPath: true,
      title: 'Custom title'
    })
  })

  it('produces a component that re-renders on every mount (factory-shaped)', () => {
    const route = resourceEditorRoute({ extension: buildExtension() })
    // The host component is built inline, assert it carries a render fn so
    // the route record is mountable.
    expect(route.component).toBeDefined()
    expect((route.component as { render?: unknown }).render).toBeTypeOf('function')
  })
})
