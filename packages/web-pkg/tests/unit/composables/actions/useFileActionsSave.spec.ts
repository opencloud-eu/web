import { mock } from 'vitest-mock-extended'
import { ref, unref } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useFileActionsSave } from '../../../../src/composables/actions/useFileActionsSave'
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
})

function getWrapper({
  setup
}: {
  setup: (instance: ReturnType<typeof useFileActionsSave>) => void
}) {
  const mocks = defaultComponentMocks()
  return getComposableWrapper(
    () => {
      const instance = useFileActionsSave({
        content: ref(''),
        isDirty: ref(false),
        isEditor: ref(true),
        isReadOnly: ref(false),
        onSave: vi.fn()
      })
      setup(instance)
    },
    { mocks, provide: mocks }
  )
}
