import { navItems, routes } from '../../src/index'
import { Ability } from '@opencloud-eu/web-client'
import { AppNavigationItem, GlobalProperties } from '@opencloud-eu/web-pkg'
import { mock } from 'vitest-mock-extended'
import { RouteRecordRaw } from 'vue-router'

const getAbilityMock = (hasPermission: boolean) => mock<Ability>({ can: () => hasPermission })
const callableNavItems = navItems as (args: GlobalProperties) => AppNavigationItem[]
const callableRoutes = routes as (args: GlobalProperties) => RouteRecordRaw[]
const getPropMock = (ability: Ability) =>
  mock<GlobalProperties>({ $ability: ability, $gettext: (s: string) => s })

describe('admin settings index', () => {
  describe('navItems', () => {
    describe('general', () => {
      it.each([true, false])('should be enabled according to the permissions', (enabled) => {
        expect(
          callableNavItems(getPropMock(getAbilityMock(enabled)))
            .find((n) => n.name === 'General')
            .isVisible()
        ).toBe(enabled)
      })
    })
    describe('user management', () => {
      it.each([true, false])('should be enabled according to the permissions', (enabled) => {
        expect(
          callableNavItems(getPropMock(getAbilityMock(enabled)))
            .find((n) => n.name === 'Users')
            .isVisible()
        ).toBe(enabled)
      })
    })
    describe('group management', () => {
      it.each([true, false])('should be enabled according to the permissions', (enabled) => {
        expect(
          callableNavItems(getPropMock(getAbilityMock(enabled)))
            .find((n) => n.name === 'Groups')
            .isVisible()
        ).toBe(enabled)
      })
    })
    describe('space management', () => {
      it.each([true, false])('should be enabled according to the permissions', (enabled) => {
        expect(
          callableNavItems(getPropMock(getAbilityMock(enabled)))
            .find((n) => n.name === 'Spaces')
            .isVisible()
        ).toBe(enabled)
      })
    })
  })
  describe('routes', () => {
    describe('default-route "/"', () => {
      it('should redirect to general if permission given', () => {
        const ability = mock<Ability>()
        ability.can.mockReturnValueOnce(true)
        const route = callableRoutes(getPropMock(ability)).find((n) => n.path === '/')
        const nextMock = vi.fn()
        ;(route.beforeEnter as any)({}, {}, nextMock)
        expect(nextMock).toHaveBeenCalledWith({ name: 'admin-settings-general' })
      })
      it('should redirect to user management if permission given', () => {
        const ability = mock<Ability>()
        ability.can.mockReturnValueOnce(false)
        ability.can.mockReturnValueOnce(true)
        const route = callableRoutes(getPropMock(ability)).find((n) => n.path === '/')
        const nextMock = vi.fn()
        ;(route.beforeEnter as any)({}, {}, nextMock)
        expect(nextMock).toHaveBeenCalledWith({ name: 'admin-settings-users' })
      })
      it('should redirect to group management if permission given', () => {
        const ability = mock<Ability>()
        ability.can.mockReturnValueOnce(false)
        ability.can.mockReturnValueOnce(false)
        ability.can.mockReturnValueOnce(true)
        const route = callableRoutes(getPropMock(ability)).find((n) => n.path === '/')
        const nextMock = vi.fn()
        ;(route.beforeEnter as any)({}, {}, nextMock)
        expect(nextMock).toHaveBeenCalledWith({ name: 'admin-settings-groups' })
      })
      it('should redirect to space management if permission given', () => {
        const ability = mock<Ability>()
        ability.can.mockReturnValueOnce(false)
        ability.can.mockReturnValueOnce(false)
        ability.can.mockReturnValueOnce(false)
        ability.can.mockReturnValueOnce(true)
        const route = callableRoutes(getPropMock(ability)).find((n) => n.path === '/')
        const nextMock = vi.fn()
        ;(route.beforeEnter as any)({}, {}, nextMock)
        expect(nextMock).toHaveBeenCalledWith({ name: 'admin-settings-spaces' })
      })
      it('redirects to / if permissions are insufficient', () => {
        const ability = mock<Ability>()
        ability.can.mockReturnValue(false)
        const route = callableRoutes(getPropMock(ability)).find((n) => n.path === '/')
        const nextMock = vi.fn()
        ;(route.beforeEnter as any)({}, {}, nextMock)
        expect(nextMock).toHaveBeenCalledWith({ path: '/' })
      })
    })
    it.each([
      { can: true, redirect: null },
      { can: false, redirect: { path: '/' } }
    ])('redirects "/general" with sufficient permissions', ({ can, redirect }) => {
      const ability = mock<Ability>({ can: vi.fn(() => can) })
      const route = callableRoutes(getPropMock(ability)).find((n) => n.path === '/general')
      const nextMock = vi.fn()
      ;(route.beforeEnter as any)({}, {}, nextMock)
      const args = [...(redirect ? [redirect] : [])]
      expect(nextMock).toHaveBeenCalledWith(...args)
    })
    it.each([
      { can: true, redirect: null },
      { can: false, redirect: { path: '/' } }
    ])('redirects "/users" with sufficient permissions', ({ can, redirect }) => {
      const ability = mock<Ability>({ can: vi.fn(() => can) })
      const route = callableRoutes(getPropMock(ability)).find((n) => n.path === '/users')
      const nextMock = vi.fn()
      ;(route.beforeEnter as any)({}, {}, nextMock)
      const args = [...(redirect ? [redirect] : [])]
      expect(nextMock).toHaveBeenCalledWith(...args)
    })
    it.each([
      { can: true, redirect: null },
      { can: false, redirect: { path: '/' } }
    ])('redirects "/groups" with sufficient permissions', ({ can, redirect }) => {
      const ability = mock<Ability>({ can: vi.fn(() => can) })
      const route = callableRoutes(getPropMock(ability)).find((n) => n.path === '/groups')
      const nextMock = vi.fn()
      ;(route.beforeEnter as any)({}, {}, nextMock)
      const args = [...(redirect ? [redirect] : [])]
      expect(nextMock).toHaveBeenCalledWith(...args)
    })
    it.each([
      { can: true, redirect: null },
      { can: false, redirect: { path: '/' } }
    ])('redirects "/spaces" with sufficient permissions', ({ can, redirect }) => {
      const ability = mock<Ability>({ can: vi.fn(() => can) })
      const route = callableRoutes(getPropMock(ability)).find((n) => n.path === '/spaces')
      const nextMock = vi.fn()
      ;(route.beforeEnter as any)({}, {}, nextMock)
      const args = [...(redirect ? [redirect] : [])]
      expect(nextMock).toHaveBeenCalledWith(...args)
    })
  })
})
