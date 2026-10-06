import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useOpenCloudRequirement } from '../../../src/composables'
import { AppVersion } from '../../../src/types'

const url = 'https://example.com/app.zip'

describe('useOpenCloudRequirement', () => {
  it.each<{ version: AppVersion; range: string; requirement: string }>([
    {
      version: { version: '1.0.0', url, minOpenCloud: '6.0.0', maxOpenCloud: '7.5.0' },
      range: 'OpenCloud 6.0.0 – 7.5.0',
      requirement: 'Requires OpenCloud 6.0.0 to 7.5.0'
    },
    {
      version: { version: '1.0.0', url, minOpenCloud: '6.0.0' },
      range: 'OpenCloud 6.0.0+',
      requirement: 'Requires OpenCloud 6.0.0 or newer'
    },
    {
      version: { version: '1.0.0', url, maxOpenCloud: '7.5.0' },
      range: 'OpenCloud up to 7.5.0',
      requirement: 'Requires OpenCloud 7.5.0 or older'
    },
    { version: { version: '1.0.0', url }, range: '', requirement: '' }
  ])('returns "$range" and "$requirement"', ({ version, range, requirement }) => {
    getComposableWrapper(() => {
      const { getVersionRange, getRequirementText } = useOpenCloudRequirement()
      expect(getVersionRange(version)).toBe(range)
      expect(getRequirementText(version)).toBe(requirement)
    })
  })
})
