import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { isItemInCurrentFolder, useResourcesStore } from '../../../../src'

describe('helpers', () => {
  describe('method "isItemInCurrentFolder"', () => {
    it('returns "true" when item is in current folder', () => {
      const mocks = getMocks()
      expect(
        isItemInCurrentFolder({
          resourcesStore: mocks.resourcesStore,
          parentFolderId: 'currentFolder!currentFolder'
        })
      ).toBeTruthy()
    })
    it('returns "false" when item is not in current folder', () => {
      const mocks = getMocks()
      expect(
        isItemInCurrentFolder({
          resourcesStore: mocks.resourcesStore,
          parentFolderId: 'differentFolder!differentFolder'
        })
      ).toBeFalsy()
    })
    describe('current folder is space', () => {
      it('returns "true" when item is in current folder', () => {
        const mocks = getMocks({
          currentFolder: mock<SpaceResource>({
            id: 'bbf8b91f-54be-45f0-935e-a50c4922db21$c96eb07d-54a5-47bf-8402-64ad9a007797'
          })
        })
        expect(
          isItemInCurrentFolder({
            resourcesStore: mocks.resourcesStore,
            parentFolderId:
              'bbf8b91f-54be-45f0-935e-a50c4922db21$c96eb07d-54a5-47bf-8402-64ad9a007797!c96eb07d-54a5-47bf-8402-64ad9a007797'
          })
        ).toBeTruthy()
      })
      it('returns "false" when item is not in current folder', () => {
        const mocks = getMocks({
          currentFolder: mock<SpaceResource>({
            id: 'bbf8b91f-54be-45f0-935e-a50c4922db21$c96eb07d-54a5-47bf-8402-64ad9a007797'
          })
        })
        expect(
          isItemInCurrentFolder({
            resourcesStore: mocks.resourcesStore,
            parentFolderId: 'differentFolder!differentFolder'
          })
        ).toBeFalsy()
      })
    })
  })
})

const getMocks = ({
  currentFolder = mock<Resource>({
    id: 'currentFolder!currentFolder',
    isFolder: true,
    storageId: 'space1'
  })
}: { currentFolder?: Resource } = {}) => {
  createTestingPinia()
  const resourcesStore = useResourcesStore()
  resourcesStore.currentFolder = currentFolder

  return {
    resourcesStore
  }
}
