import { mock } from 'vitest-mock-extended'
import { getExtensionNavItems } from '../../../../src/composables/navItems'
import type { ExtensionRegistry, SidebarNavExtension } from '../../../../src/composables'
import type { AppNavigationItem } from '../../../../src/apps'

describe('getExtensionNavItems', () => {
  const userItem: AppNavigationItem = { name: 'user' }
  const guestItem: AppNavigationItem = { name: 'guest', authContext: 'guest' }

  function getExtensionRegistry() {
    const extensionRegistry = mock<ExtensionRegistry>()
    extensionRegistry.requestExtensions.mockReturnValue([
      { navItem: userItem } as SidebarNavExtension,
      { navItem: guestItem } as SidebarNavExtension
    ])
    return extensionRegistry
  }

  it('returns user items by default', () => {
    const items = getExtensionNavItems({
      extensionRegistry: getExtensionRegistry(),
      appId: 'files'
    })
    expect(items).toEqual([userItem])
  })
  it('returns guest items for the guest context', () => {
    const items = getExtensionNavItems({
      extensionRegistry: getExtensionRegistry(),
      appId: 'files',
      authContext: 'guest'
    })
    expect(items).toEqual([guestItem])
  })
})
