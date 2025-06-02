import { useSpaceHelpers } from '../../../../src/composables/spaces'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'

describe('useSpaceHelpers', () => {
  it('should be valid', () => {
    expect(useSpaceHelpers).toBeDefined()
  })
  describe('method "checkSpaceNameModalInput"', () => {
    it('should not show an error message with a valid space name', () => {
      getWrapper({
        setup: ({ checkSpaceNameModalInput }) => {
          checkSpaceNameModalInput('Space', (value) => {
            expect(value).toEqual(null)
          })
        }
      })
    })
    it('should show an error message with an empty name', () => {
      getWrapper({
        setup: ({ checkSpaceNameModalInput }) => {
          checkSpaceNameModalInput('', (value) => {
            expect(value).not.toEqual(null)
          })
        }
      })
    })
    it('should show an error with an name longer than 63 characters', () => {
      getWrapper({
        setup: ({ checkSpaceNameModalInput }) => {
          checkSpaceNameModalInput('n'.repeat(64), (value) => {
            expect(value).not.toEqual(null)
          })
        }
      })
    })
    it.each(['/', '\\', '.', ':', '?', '*', '"', '>', '<', '|'])(
      'should show an error message with a name including a special character',
      (specialChar) => {
        getWrapper({
          setup: ({ checkSpaceNameModalInput }) => {
            checkSpaceNameModalInput(specialChar, (value) => {
              expect(value).not.toEqual(null)
            })
          }
        })
      }
    )
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
