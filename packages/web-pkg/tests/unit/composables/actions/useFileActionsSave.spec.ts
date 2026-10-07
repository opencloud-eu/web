import { mock } from 'vitest-mock-extended'
import { ref, unref } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useFileActionsSave } from '../../../../src/composables/actions/useFileActionsSave'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'

describe('useFileActionsSave', () => {
  describe('saveAsAction isVisible', () => {
    it.each([
      { driveType: 'public', isReadOnly: true, visible: false },
      { driveType: 'public', isReadOnly: false, visible: true },
      { driveType: 'personal', isReadOnly: true, visible: true }
    ])(
      'visible: $visible in a $driveType space with isReadOnly: $isReadOnly',
      ({ driveType, isReadOnly, visible }) => {
        getWrapper({
          isReadOnly,
          setup: ({ saveAsAction }) => {
            const space = mock<SpaceResource>({ id: '1', driveType })
            expect(unref(saveAsAction).isVisible({ space, resources: [mock<Resource>()] })).toBe(
              visible
            )
          }
        })
      }
    )
  })
})

function getWrapper({
  isReadOnly,
  setup
}: {
  isReadOnly: boolean
  setup: (instance: ReturnType<typeof useFileActionsSave>) => void
}) {
  const mocks = defaultComponentMocks()
  return getComposableWrapper(
    () => {
      const instance = useFileActionsSave({
        content: ref(''),
        isDirty: ref(false),
        isEditor: ref(true),
        isReadOnly: ref(isReadOnly),
        onSave: vi.fn()
      })
      setup(instance)
    },
    { mocks, provide: mocks }
  )
}
