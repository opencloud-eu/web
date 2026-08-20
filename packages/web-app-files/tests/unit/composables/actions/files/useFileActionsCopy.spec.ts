import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useFileActionsCopy } from '../../../../../src/composables/actions/files'

describe('copy', () => {
  describe('computed property "actions"', () => {
    describe('isVisible', () => {
      it('returns true if "canDownload" is true', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: null,
                resources: [mock<Resource>({ id: '1', canDownload: () => true, isInVault: false })]
              })
            ).toBeTruthy()
          }
        })
      })
      it('returns false if "canDownload" is false', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: null,
                resources: [mock<Resource>({ id: '1', canDownload: () => false, isInVault: false })]
              })
            ).toBeFalsy()
          }
        })
      })
      it('returns false for trashed resources', () => {
        getWrapper({
          setup: ({ actions }) => {
            const resource = {
              ...mock<Resource>({ id: '1', canDownload: () => true, isInVault: false }),
              ddate: '2026-01-01'
            } as Resource
            expect(unref(actions)[0].isVisible({ space: null, resources: [resource] })).toBeFalsy()
          }
        })
      })
      it('returns false for share list entries', () => {
        getWrapper({
          currentFolder: null,
          setup: ({ actions }) => {
            const resource = {
              ...mock<Resource>({ id: '1', canDownload: () => true, isInVault: false }),
              sharedWith: []
            } as Resource
            expect(unref(actions)[0].isVisible({ space: null, resources: [resource] })).toBeFalsy()
          }
        })
      })
      it('returns true for a share root browsed inside its space', () => {
        getWrapper({
          setup: ({ actions }) => {
            const resource = {
              ...mock<Resource>({ id: '1', canDownload: () => true, isInVault: false }),
              sharedWith: []
            } as Resource
            expect(unref(actions)[0].isVisible({ space: null, resources: [resource] })).toBeTruthy()
          }
        })
      })
      it('returns false when resources contain a project space', () => {
        getWrapper({
          setup: ({ actions }) => {
            const projectSpace = {
              ...mock<Resource>({ id: '1', canDownload: () => true }),
              type: 'space',
              driveType: 'project'
            } as Resource
            expect(
              unref(actions)[0].isVisible({
                space: null,
                resources: [projectSpace]
              })
            ).toBeFalsy()
          }
        })
      })
    })
  })
})

function getWrapper({
  currentFolder = mock<Resource>({ id: 'cf-1', path: '/source' }),
  setup
}: {
  currentFolder?: Resource
  setup: (instance: ReturnType<typeof useFileActionsCopy>) => void
}) {
  const mocks = {
    ...defaultComponentMocks()
  }
  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsCopy()
        setup(instance)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { resourcesStore: { currentFolder } } }
      }
    )
  }
}
