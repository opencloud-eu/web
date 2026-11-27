import { unref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import {
  ActionExtension,
  resourceDragDataType,
  useExtensionRegistry,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { createTrashNavItemDrop } from '../../../src/helpers/trashNavItemDrop'
import { useFileActionsDelete } from '../../../src/composables/actions'
import { useFileActionsDeleteResources } from '../../../src/composables/actions/useFileActionsDeleteResources'
import { deleteFileActionExtensionId } from '../../../src/composables/extensions/useFileActions'

vi.mock('../../../src/composables/actions/useFileActionsDeleteResources')

function getResource(resource: Partial<Resource> = {}) {
  return {
    id: 'file',
    type: 'file',
    storageId: 'space1',
    canBeDeleted: () => true,
    isShareRoot: () => false,
    ...resource
  } as Resource
}

function getDragEvent(types: string[] = [resourceDragDataType]) {
  return { dataTransfer: { types } } as unknown as DragEvent
}

describe('createTrashNavItemDrop', () => {
  it('allows dropping deletable resources', () => {
    getWrapper({
      resources: [getResource(), getResource({ id: 'folder', type: 'folder' })],
      setup: (drop) => {
        expect(drop.isAllowed(getDragEvent())).toBe(true)
      }
    })
  })
  it.each([
    { name: 'a share root', resource: getResource({ isShareRoot: () => true }) },
    {
      name: 'a resource without delete permission',
      resource: getResource({ canBeDeleted: () => false })
    },
    { name: 'a space', resource: getResource({ type: 'space' }) }
  ])('does not allow dropping when the dragged resources contain $name', ({ resource }) => {
    getWrapper({
      resources: [getResource(), resource],
      setup: (drop) => {
        expect(drop.isAllowed(getDragEvent())).toBe(false)
      }
    })
  })
  it('does not allow dropping a single locked file', () => {
    getWrapper({
      resources: [getResource({ locked: true })],
      setup: (drop) => {
        expect(drop.isAllowed(getDragEvent())).toBe(false)
      }
    })
  })
  it('ignores external file drags', () => {
    getWrapper({
      resources: [getResource()],
      setup: (drop) => {
        expect(drop.isAllowed(getDragEvent(['Files']))).toBe(false)
      }
    })
  })
  it('ignores drags without resources', () => {
    getWrapper({
      resources: [],
      setup: (drop) => {
        expect(drop.isAllowed(getDragEvent())).toBe(false)
      }
    })
  })
  it('explains why resources cannot be dropped', () => {
    getWrapper({
      resources: [getResource()],
      setup: (drop) => {
        expect(drop.notAllowedMessage(getDragEvent())).toBe("One or more items can't be deleted")
      }
    })
  })
  it('explains nothing for external file drags', () => {
    getWrapper({
      resources: [getResource()],
      setup: (drop) => {
        expect(drop.notAllowedMessage(getDragEvent(['Files']))).toBe('')
      }
    })
  })
  it('deletes the dragged resources via the delete action, also of different spaces', () => {
    const filesListDeleteMock = vi.fn()
    // like a drag out of favorites or search results
    const resources = [
      getResource(),
      getResource({ id: 'folder', type: 'folder', storageId: 'space2' })
    ]
    getWrapper({
      resources,
      filesListDeleteMock,
      setup: (drop) => {
        expect(drop.isAllowed(getDragEvent())).toBe(true)
        drop.handler(getDragEvent())
        expect(filesListDeleteMock).toHaveBeenCalledWith(resources)
      }
    })
  })
})

function getWrapper({
  resources,
  filesListDeleteMock = vi.fn(),
  setup
}: {
  resources: Resource[]
  filesListDeleteMock?: (resources: Resource[]) => Promise<void>[]
  setup: (drop: ReturnType<typeof createTrashNavItemDrop>) => void
}) {
  vi.mocked(useFileActionsDeleteResources).mockImplementation(() => ({
    filesList_delete: filesListDeleteMock,
    displayDialog: vi.fn()
  }))
  const mocks = defaultComponentMocks()

  return getComposableWrapper(
    () => {
      const deleteAction = unref(useFileActionsDelete().actions).find(
        ({ name }) => name === 'delete'
      )
      vi.mocked(useExtensionRegistry().requestExtensions).mockReturnValue([
        mock<ActionExtension>({ id: 'other-action' }),
        { id: deleteFileActionExtensionId, type: 'action', action: deleteAction } as ActionExtension
      ])
      useResourcesStore().draggedResources = resources

      setup(createTrashNavItemDrop({ $gettext: (msg: string) => msg }))
    },
    { mocks, provide: mocks }
  )
}
