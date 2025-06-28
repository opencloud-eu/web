import { useSpaceHelpers } from '../../../../src/composables/spaces'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'

describe('useSpaceHelpers', () => {
  it('should be valid', () => {
    expect(useSpaceHelpers).toBeDefined()
  })
})

function getWrapper({ setup }: { setup: (instance: ReturnType<typeof useSpaceHelpers>) => void }) {
  const mocks = defaultComponentMocks()

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceHelpers()
        setup(instance)
      },
      {
        mocks
      }
    )
  }
}
