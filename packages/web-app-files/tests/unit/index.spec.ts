import { createPinia, setActivePinia } from 'pinia'
import { navItems } from '../../src/index'
import { useSpacesStore } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'

describe('Web app files', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const spacesStore = useSpacesStore()
    spacesStore.spacesInitialized = true
  })

  describe('navItems', () => {
    describe('Personal', () => {
      it('should be enabled if user has a personal space', () => {
        const spacesStore = useSpacesStore()
        spacesStore.spaces = [
          mock<SpaceResource>({ id: '1', driveType: 'personal', isOwner: () => true })
        ]
        const items = navItems(undefined)
        expect(items[0].isVisible()).toBeTruthy()
      })
      it('should be disabled if user has no a personal space', () => {
        const spacesStore = useSpacesStore()
        spacesStore.spaces = [
          mock<SpaceResource>({ id: '1', driveType: 'project', isOwner: () => false })
        ]
        const items = navItems(undefined)
        expect(items[0].isVisible()).toBeFalsy()
      })
    })
  })
})
