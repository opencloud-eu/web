import { mock } from 'vitest-mock-extended'
import { SpaceResource } from '@opencloud-eu/web-client'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useSuggestedSpaceName } from '../../../../src/composables/spaces'

function space(name: string, driveType = 'project') {
  return mock<SpaceResource>({ name, driveType })
}

describe('useSuggestedSpaceName', () => {
  it('suggests "New space" when no project space uses it', () => {
    expect(getSuggestedSpaceName([space('Other space')])).toBe('New space')
  })

  it('counts the name up past the project spaces that already use it', () => {
    expect(getSuggestedSpaceName([space('New space'), space('New space (1)')])).toBe(
      'New space (2)'
    )
  })

  it('ignores spaces that are not project spaces', () => {
    expect(getSuggestedSpaceName([space('New space', 'personal')])).toBe('New space')
    expect(getSuggestedSpaceName([space('New space'), space('New space (1)', 'personal')])).toBe(
      'New space (1)'
    )
  })
})

function getSuggestedSpaceName(spaces: SpaceResource[]) {
  let suggestedName: string
  getComposableWrapper(
    () => {
      suggestedName = useSuggestedSpaceName().getSuggestedSpaceName()
    },
    { pluginOptions: { piniaOptions: { spacesState: { spaces } } } }
  )
  return suggestedName
}
