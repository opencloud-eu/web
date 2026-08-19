import {
  isLocationActive,
  isLocationActiveDirector,
  createLocation
} from '../../../src/router/utils'
import { RouteLocation, RouteLocationNamedRaw, Router } from 'vue-router'
import { mock } from 'vitest-mock-extended'
import { ref } from 'vue'

describe('utils', () => {
  describe('isLocationActive', () => {
    it('returns true if one location is active', () => {
      const fakeRouter = mock<Router>({
        currentRoute: ref({ name: 'foo', path: '/foo' }),
        resolve: (r: RouteLocationNamedRaw) =>
          mock<RouteLocation & { href: string }>({ href: r.name.toString() })
      })

      expect(isLocationActive(fakeRouter, mock<RouteLocationNamedRaw>({ name: 'foo' }))).toBe(true)
      expect(
        isLocationActive(
          fakeRouter,
          mock<RouteLocationNamedRaw>({ name: 'foo' }),
          mock<RouteLocationNamedRaw>({ name: 'bar' })
        )
      ).toBe(true)
    })

    it('returns false if all locations inactive', () => {
      const fakeRouter = mock<Router>({
        currentRoute: ref({ name: 'foo', path: '/foo' }),
        resolve: (r: RouteLocationNamedRaw) =>
          mock<RouteLocation & { href: string }>({ href: r.name.toString() })
      })

      expect(isLocationActive(fakeRouter, mock<RouteLocationNamedRaw>({ name: 'bar' }))).toBe(false)
      expect(
        isLocationActive(
          fakeRouter,
          mock<RouteLocationNamedRaw>({ name: 'bar' }),
          mock<RouteLocationNamedRaw>({ name: 'baz' })
        )
      ).toBe(false)
    })

    it('resolves the current route and each comparative only once per route', () => {
      const resolve = vi.fn((r: RouteLocationNamedRaw) =>
        mock<RouteLocation & { href: string }>({ href: r.name.toString() })
      )
      const fakeRouter = mock<Router>({
        currentRoute: ref({ name: 'foo', path: '/foo' }),
        resolve
      })
      const comparative = mock<RouteLocationNamedRaw>({ name: 'foo' })

      expect(isLocationActive(fakeRouter, comparative)).toBe(true)
      expect(isLocationActive(fakeRouter, comparative)).toBe(true)

      // once for the current route, once for the comparative
      expect(resolve).toHaveBeenCalledTimes(2)
    })

    it('invalidates the cached hrefs on navigation', () => {
      const currentRoute = ref({ name: 'foo', path: '/foo' })
      const fakeRouter = mock<Router>({
        currentRoute,
        resolve: (r: RouteLocationNamedRaw) =>
          mock<RouteLocation & { href: string }>({ href: r.name.toString() })
      })
      const comparative = mock<RouteLocationNamedRaw>({ name: 'bar' })

      expect(isLocationActive(fakeRouter, comparative)).toBe(false)

      currentRoute.value = { name: 'bar', path: '/bar' }

      expect(isLocationActive(fakeRouter, comparative)).toBe(true)
    })

    it('invalidates the cached hrefs if only the path changes', () => {
      const currentRoute = ref({ name: 'foo', path: '/foo/folder-1' })
      const fakeRouter = mock<Router>({
        currentRoute,
        resolve: (r: RouteLocationNamedRaw & { path?: string }) =>
          mock<RouteLocation & { href: string }>({ href: r.path ?? r.name.toString() })
      })
      const comparative = mock<RouteLocationNamedRaw>({ name: '/foo/folder-2' })

      expect(isLocationActive(fakeRouter, comparative)).toBe(false)

      currentRoute.value = { name: 'foo', path: '/foo/folder-2' }

      expect(isLocationActive(fakeRouter, comparative)).toBe(true)
    })

    it('keeps the cached hrefs if only the query changes', () => {
      const currentRoute = ref({ name: 'foo', path: '/foo', fullPath: '/foo' })
      const resolve = vi.fn((r: RouteLocationNamedRaw & { fullPath?: string }) =>
        mock<RouteLocation & { href: string }>({ href: r.fullPath ?? r.name.toString() })
      )
      const fakeRouter = mock<Router>({ currentRoute, resolve })
      const comparative = mock<RouteLocationNamedRaw>({ name: '/foo' })

      expect(isLocationActive(fakeRouter, comparative)).toBe(true)

      currentRoute.value = { name: 'foo', path: '/foo', fullPath: '/foo?sort-by=name' }

      expect(isLocationActive(fakeRouter, comparative)).toBe(true)
      // once for the current route, once for the comparative
      expect(resolve).toHaveBeenCalledTimes(2)
    })

    it('ignores the query when comparing hrefs', () => {
      const fakeRouter = mock<Router>({
        currentRoute: ref({ name: 'foo', path: '/foo', fullPath: '/foo?sort-by=name' }),
        resolve: (r: RouteLocationNamedRaw & { fullPath?: string }) =>
          mock<RouteLocation & { href: string }>({ href: r.fullPath ?? r.name.toString() })
      })
      const comparative = mock<RouteLocationNamedRaw>({ name: '/foo?tab=general' })

      expect(isLocationActive(fakeRouter, comparative)).toBe(true)
    })
  })

  describe('isLocationActiveDirector', () => {
    test('director can be created and be used to check active locations', () => {
      const currentRoute = ref({ name: 'unknown', path: '/unknown' })
      const fakeRouter = mock<Router>({
        currentRoute,
        resolve: (r: RouteLocationNamedRaw) =>
          mock<RouteLocation & { href: string }>({ href: r.name.toString() })
      })

      const isFilesLocationActive = isLocationActiveDirector(
        mock<RouteLocationNamedRaw>({ name: 'foo' }),
        mock<RouteLocationNamedRaw>({ name: 'bar' }),
        mock<RouteLocationNamedRaw>({ name: 'baz' })
      )
      expect(isFilesLocationActive(fakeRouter)).toBe(false)

      currentRoute.value = { name: 'bar', path: '/bar' }

      expect(isFilesLocationActive(fakeRouter)).toBe(true)
      expect(isFilesLocationActive(fakeRouter, 'foo', 'bar')).toBe(true)
    })

    test('director closure only allows to check known locations and throws if unknown', () => {
      const fakeRouter = mock<Router>({
        currentRoute: ref({ name: 'baz', path: '/baz' }),
        resolve: (r: RouteLocationNamedRaw) =>
          mock<RouteLocation & { href: string }>({ href: r.name.toString() })
      })

      const isFilesLocationActive = isLocationActiveDirector(
        mock<RouteLocationNamedRaw>({ name: 'foo' }),
        mock<RouteLocationNamedRaw>({ name: 'bar' })
      )
      expect(() => isFilesLocationActive(fakeRouter, 'unknown')).toThrow()
    })
  })

  describe('createLocationDirector', () => {
    test('creates a location and handle arguments', () => {
      const testLocation = createLocation(
        'foo',
        mock<RouteLocationNamedRaw>({
          params: { foo: 'foo-param-value' },
          query: { bar: 'bar-query-value' }
        })
      )
      expect(testLocation.name).toBe('foo')
      expect(testLocation.params.foo).toBe('foo-param-value')
      expect(testLocation.query.bar).toBe('bar-query-value')
    })
  })
})
