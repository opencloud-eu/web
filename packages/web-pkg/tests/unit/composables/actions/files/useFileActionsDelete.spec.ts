import { unref } from 'vue'
import {
  useFileActionsDeleteResources,
  useFileActionsDelete
} from '../../../../../src/composables/actions'
import {
  IncomingShareResource,
  ProjectSpaceResource,
  Resource,
  SpaceResource,
  TrashResource
} from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { CapabilityStore } from '../../../../../src/composables/piniaStores'

vi.mock('../../../../../src/composables/actions/helpers/useFileActionsDeleteResources')

describe('delete', () => {
  describe('computed property "actions"', () => {
    describe('delete isVisible property of returned element', () => {
      it.each([
        {
          resources: [{ canBeDeleted: () => true, isShareRoot: () => false }] as Resource[],
          isVisible: true
        },
        {
          resources: [{ canBeDeleted: () => false, isShareRoot: () => false }] as Resource[],
          isVisible: false
        },
        {
          resources: [
            { canBeDeleted: () => true, isShareRoot: () => false, type: 'space' }
          ] as SpaceResource[],
          isVisible: false
        },
        {
          resources: [
            { canBeDeleted: () => true, isShareRoot: () => false, sharedWith: {} }
          ] as IncomingShareResource[],
          isVisible: false
        },
        {
          resources: [
            { canBeDeleted: () => true, isShareRoot: () => false, ddate: 'date' }
          ] as TrashResource[],
          isVisible: false
        },
        {
          resources: [{ canBeDeleted: () => true, isShareRoot: () => true }] as Resource[],
          isVisible: false
        }
      ])('should be set correctly', ({ resources, isVisible }) => {
        getWrapper({
          setup: () => {
            const { actions } = useFileActionsDelete()
            expect(unref(actions)[0].isVisible({ space: null, resources })).toBe(isVisible)
          }
        })
      })
    })
    describe('delete isDisabled property of returned element', () => {
      it.each<{ resources: Resource[]; isDisabled: boolean }>([
        {
          resources: [{ locked: true } as Resource],
          isDisabled: true
        },
        {
          resources: [{ locked: false } as Resource],
          isDisabled: false
        },
        {
          resources: [{ locked: true }, { locked: false }] as Resource[],
          isDisabled: false
        }
      ])('should be set correctly', ({ resources, isDisabled }) => {
        getWrapper({
          setup: () => {
            const { actions } = useFileActionsDelete()
            expect(unref(actions)[0].isDisabled({ space: null, resources })).toBe(isDisabled)
          }
        })
      })
    })
    describe('delete-permanent isVisible property of returned element', () => {
      it.each([
        {
          space: {} as ProjectSpaceResource,
          resources: [{ ddate: 'date' }] as TrashResource[],
          deletePermanent: true,
          isVisible: true
        },
        {
          space: {} as ProjectSpaceResource,
          resources: [{}] as Resource[],
          deletePermanent: true,
          isVisible: false
        },
        {
          space: {
            driveType: 'project',
            canDeleteFromTrashBin: () => false
          } as ProjectSpaceResource,
          resources: [{ ddate: 'date' }] as TrashResource[],
          deletePermanent: true,
          isVisible: false
        },
        {
          space: {} as ProjectSpaceResource,
          resources: [{ ddate: 'date' }] as TrashResource[],
          deletePermanent: false,
          isVisible: false
        }
      ])('should be set correctly', ({ space, resources, deletePermanent, isVisible }) => {
        getWrapper({
          deletePermanent,
          setup: () => {
            const { actions } = useFileActionsDelete()
            expect(unref(actions)[1].isVisible({ space, resources })).toBe(isVisible)
          }
        })
      })
    })
  })
  describe('computed property "actions"', () => {
    describe('handler', () => {
      it('calls filesListDelete for the file list delete action', () => {
        const filesListDeleteMock = vi.fn()

        getWrapper({
          filesListDeleteMock,
          setup: () => {
            const resources = [{}, {}] as Resource[]
            const { actions } = useFileActionsDelete()
            unref(actions)[0].handler({ space: null, resources })

            expect(filesListDeleteMock).toHaveBeenCalledWith(resources)
          }
        })
      })
      it('calls displayDialog for the permanent delete action', () => {
        const displayDialogMock = vi.fn()

        getWrapper({
          displayDialogMock,
          setup: () => {
            const resources = [{}, {}] as Resource[]
            const space = {} as ProjectSpaceResource
            const { actions } = useFileActionsDelete()
            unref(actions)[1].handler({ space, resources })

            expect(displayDialogMock).toHaveBeenCalledWith(space, resources)
          }
        })
      })
    })
  })
})

function getWrapper({
  deletePermanent = false,
  filesListDeleteMock = vi.fn(),
  displayDialogMock = vi.fn(),
  setup = () => undefined
}: {
  deletePermanent?: boolean
  filesListDeleteMock?: (resources: Resource[]) => void[]
  displayDialogMock?: (...args: unknown[]) => unknown
  setup?: () => unknown
} = {}) {
  vi.mocked(useFileActionsDeleteResources).mockImplementation(() => ({
    filesList_delete: filesListDeleteMock,
    displayDialog: displayDialogMock
  }))
  const mocks = defaultComponentMocks()
  const capabilities = {
    spaces: { enabled: true },
    files: { permanent_deletion: deletePermanent }
  } satisfies Partial<CapabilityStore['capabilities']>

  return {
    wrapper: getComposableWrapper(setup, {
      mocks,
      provide: mocks,
      pluginOptions: { piniaOptions: { capabilityState: { capabilities } } }
    })
  }
}
