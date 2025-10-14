import {
  FileAction,
  useFileActionsRestore,
  useFileActionsUndoDelete
} from '../../../../../src/composables/actions'
import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { CapabilityStore, Message, useMessages } from '../../../../../src/composables/piniaStores'
import { computed, ref, unref } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { SpaceResource } from '@opencloud-eu/web-client'

vi.mock('../../../../../src/composables/actions/files/useFileActionsRestore')

describe('undoDelete', () => {
  describe('isVisible', () => {
    it.each(['project', 'personal'])(
      'is true for %s spaces if trash bins are enabled via capabilities',
      (driveType) => {
        getWrapper({
          setup: ({ actions }) => {
            const space = mock<SpaceResource>({ driveType })
            const resources = [mock<Resource>({ id: '1' })]
            const isVisible = unref(actions)[0].isVisible({ space, resources })

            expect(isVisible).toBeTruthy()
          }
        })
      }
    )
    it('is false when trash bins are disabled via capabilities', () => {
      getWrapper({
        setup: ({ actions }) => {
          const space = mock<SpaceResource>({ driveType: 'project' })
          const resources = [mock<Resource>({ id: '1' })]
          const isVisible = unref(actions)[0].isVisible({ space, resources })

          expect(isVisible).toBeFalsy()
        },
        trashBinEnabled: false
      })
    })
    it.each(['share', 'public'])('is false for %s spaces', (driveType) => {
      getWrapper({
        setup: ({ actions }) => {
          const space = mock<SpaceResource>({ driveType })
          const resources = [mock<Resource>({ id: '1' })]
          const isVisible = unref(actions)[0].isVisible({ space, resources })

          expect(isVisible).toBeFalsy()
        }
      })
    })
  })
  describe('handler', () => {
    it('calls the restore file action and transforms the ids before', () => {
      getWrapper({
        setup: async ({ actions }, { restoreHandlerMock }) => {
          const space = mock<SpaceResource>()
          const resources = [{ id: '1$2!3' } as Resource]
          await unref(actions)[0].handler({ space, resources })

          expect(restoreHandlerMock).toHaveBeenCalledWith({ space, resources: [{ id: '3' }] })
        }
      })
    })
    it('removes the message if given', () => {
      const deleteMessage = mock<Message>()
      getWrapper({
        setup: async ({ actions }) => {
          const space = mock<SpaceResource>()
          const resources = [mock<Resource>({ id: '1' })]
          const messagesStore = useMessages()
          await unref(actions)[0].handler({ space, resources })

          expect(messagesStore.removeMessage).toHaveBeenCalled()
        },
        deleteMessage
      })
    })
  })
})

function getWrapper({
  deleteMessage = undefined,
  trashBinEnabled = true,
  setup
}: {
  deleteMessage?: Message
  trashBinEnabled?: boolean
  setup: (
    instance: ReturnType<typeof useFileActionsUndoDelete>,
    mocks: {
      restoreHandlerMock: FileAction['handler']
    }
  ) => void
}) {
  const restoreHandlerMock = vi.fn()
  const useFileActionsRestoreMock = mock<ReturnType<typeof useFileActionsRestore>>()
  useFileActionsRestoreMock.actions = computed(() => [
    mock<FileAction>({ handler: restoreHandlerMock })
  ])
  vi.mocked(useFileActionsRestore).mockReturnValue(useFileActionsRestoreMock)

  const mocks = defaultComponentMocks()
  const capabilities = {
    dav: { trashbin: trashBinEnabled ? '1.0' : undefined }
  } satisfies Partial<CapabilityStore['capabilities']>

  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsUndoDelete({ deleteMessage: ref(deleteMessage) })
        setup(instance, {
          restoreHandlerMock
        })
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: {
          piniaOptions: {
            capabilityState: { capabilities }
          }
        }
      }
    )
  }
}
