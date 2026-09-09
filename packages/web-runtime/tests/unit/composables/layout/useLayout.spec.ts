import { ref, unref } from 'vue'
import { Router } from 'vue-router'
import { useLayout } from '../../../../src/composables/layout/useLayout'

describe('useLayout', () => {
  it.each([
    ['login', 'bare'],
    ['oidcCallback', 'bare'],
    ['logout', 'plain'],
    ['resolvePublicLink', 'plain'],
    ['resolveGuestLink', 'plain'],
    ['guestSessionExpired', 'plain'],
    ['accessDenied', 'plain'],
    ['files-spaces-generic', 'application']
  ])('renders the %s route in the %s layout', (name, expected) => {
    const router = { currentRoute: ref({ name }) } as unknown as Router
    const { layoutType } = useLayout({ router })

    expect(unref(layoutType)).toEqual(expected)
  })

  it('falls back to the bare layout before a route is resolved', () => {
    const router = { currentRoute: ref({ name: undefined }) } as unknown as Router
    const { layoutType } = useLayout({ router })

    expect(unref(layoutType)).toEqual('bare')
  })
})
