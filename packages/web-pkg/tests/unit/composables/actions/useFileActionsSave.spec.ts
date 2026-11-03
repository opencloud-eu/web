import { mock } from 'vitest-mock-extended'
import { ref, unref } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useFileActionsSave } from '../../../../src/composables/actions/useFileActionsSave'
import { useModals } from '../../../../src/composables/piniaStores'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'

describe('useFileActionsSave', () => {
  describe('saveAsAction isVisible', () => {
    it.each([
      { name: 'personal space', space: { driveType: 'personal' }, visible: true },
      {
        name: 'folder link with create permission',
        space: { driveType: 'public', fileId: 'folder', publicLinkPermission: 15 },
        visible: true
      },
      {
        name: 'read-only folder link',
        space: { driveType: 'public', fileId: 'folder', publicLinkPermission: 1 },
        visible: false
      },
      {
        name: 'single file link',
        space: { driveType: 'public', fileId: undefined, publicLinkPermission: 3 },
        visible: false
      }
    ])('visible: $visible in a $name', ({ space, visible }) => {
      getWrapper({
        setup: ({ saveAsAction }) => {
          expect(
            unref(saveAsAction).isVisible({
              space: mock<SpaceResource>({ id: '1', ...space }),
              resources: [mock<Resource>()]
            })
          ).toBe(visible)
        }
      })
    })
  })

  describe('saveAsAction handler', () => {
    const options = { space: mock<SpaceResource>(), resources: [mock<Resource>()] }

    it('opens the modal', async () => {
      const { saveAsAction } = getWrapper()

      await unref(saveAsAction).handler(options)

      expect(useModals().dispatchModal).toHaveBeenCalled()
    })

    it('opens the modal once the content is flushed', async () => {
      const flushContent = vi.fn().mockResolvedValue(true)
      const { saveAsAction } = getWrapper({ flushContent })

      await unref(saveAsAction).handler(options)

      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalled()
      expect(flushContent.mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(dispatchModal).mock.invocationCallOrder[0]
      )
    })

    it('does not open the modal when flushing the content failed', async () => {
      const { saveAsAction } = getWrapper({ flushContent: vi.fn().mockResolvedValue(false) })

      await unref(saveAsAction).handler(options)

      expect(useModals().dispatchModal).not.toHaveBeenCalled()
    })
  })
})

function getWrapper({
  setup = () => undefined,
  flushContent
}: {
  setup?: (instance: ReturnType<typeof useFileActionsSave>) => void
  flushContent?: () => Promise<boolean>
} = {}) {
  const mocks = defaultComponentMocks()
  let result: ReturnType<typeof useFileActionsSave>
  getComposableWrapper(
    () => {
      const instance = useFileActionsSave({
        content: ref(''),
        isDirty: ref(false),
        isEditor: ref(true),
        isReadOnly: ref(false),
        onSave: vi.fn(),
        flushContent
      })
      setup(instance)
      result = instance
    },
    { mocks, provide: mocks }
  )
  return result
}
