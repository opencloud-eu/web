import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useFileActions, useOpenWithDefaultApp } from '../../../../src/composables'

vi.mock('../../../../src/composables/actions/files', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: vi.fn()
}))

describe('useOpenWithDefaultApp', () => {
  it('should be valid', () => {
    expect(useOpenWithDefaultApp).toBeDefined()
  })
  describe('method "openWithDefaultApp"', () => {
    it('should call the default action handler for files', () => {
      getWrapper({
        setup: ({ openWithDefaultApp }, { triggerDefaultAction }) => {
          openWithDefaultApp({
            space: mock<SpaceResource>(),
            resource: mock<Resource>({ isFolder: false })
          })
          expect(triggerDefaultAction).toHaveBeenCalled()
        }
      })
    })
    it('should not call the default action handler for folders', () => {
      getWrapper({
        setup: ({ openWithDefaultApp }, { triggerDefaultAction }) => {
          openWithDefaultApp({
            space: mock<SpaceResource>(),
            resource: mock<Resource>({ isFolder: true })
          })
          expect(triggerDefaultAction).not.toHaveBeenCalled()
        }
      })
    })
  })
})

function getWrapper({
  setup,
  triggerDefaultAction = vi.fn()
}: {
  setup: (
    instance: ReturnType<typeof useOpenWithDefaultApp>,
    mocks: { triggerDefaultAction: () => void }
  ) => void
  triggerDefaultAction?: () => void
}) {
  vi.mocked(useFileActions).mockReturnValue(
    mock<ReturnType<typeof useFileActions>>({
      triggerDefaultAction
    })
  )

  const mocks = { triggerDefaultAction }

  return {
    wrapper: getComposableWrapper(() => {
      const instance = useOpenWithDefaultApp()
      setup(instance, mocks)
    })
  }
}
