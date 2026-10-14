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
const callBeforeEnter = (ability: Ability, path: string) => {
  const route = callableRoutes(getPropMock(ability)).find((n) => n.path === path)
  return (route.beforeEnter as () => unknown)()
}

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
        expect(callBeforeEnter(ability, '/')).toEqual({ name: 'admin-settings-general' })
      })
      it('should redirect to user management if permission given', () => {
        const ability = mock<Ability>()
        ability.can.mockReturnValueOnce(false)
        ability.can.mockReturnValueOnce(true)
        expect(callBeforeEnter(ability, '/')).toEqual({ name: 'admin-settings-users' })
      })
      it('should redirect to group management if permission given', () => {
        const ability = mock<Ability>()
        ability.can.mockReturnValueOnce(false)
        ability.can.mockReturnValueOnce(false)
        ability.can.mockReturnValueOnce(true)
        expect(callBeforeEnter(ability, '/')).toEqual({ name: 'admin-settings-groups' })
      })
      it('should redirect to space management if permission given', () => {
        const ability = mock<Ability>()
        ability.can.mockReturnValueOnce(false)
        ability.can.mockReturnValueOnce(false)
        ability.can.mockReturnValueOnce(false)
        ability.can.mockReturnValueOnce(true)
        expect(callBeforeEnter(ability, '/')).toEqual({ name: 'admin-settings-spaces' })
      })
      it('should redirect to the first permitted page if multiple permissions are given', () => {
        expect(callBeforeEnter(getAbilityMock(true), '/')).toEqual({
          name: 'admin-settings-general'
        })
      })
      it('redirects to / if permissions are insufficient', () => {
        expect(callBeforeEnter(getAbilityMock(false), '/')).toEqual({ path: '/' })
      })
    })
    describe.each(['/general', '/users', '/groups', '/spaces', '/apps'])('route "%s"', (path) => {
      it('allows the navigation with sufficient permissions', () => {
        expect(callBeforeEnter(getAbilityMock(true), path)).toBeUndefined()
      })
      it('redirects to / with insufficient permissions', () => {
        expect(callBeforeEnter(getAbilityMock(false), path)).toEqual({ path: '/' })
      })
    })
  })
})
