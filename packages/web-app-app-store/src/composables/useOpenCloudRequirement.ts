import { useGettext } from 'vue3-gettext'
import { AppVersion } from '../types'

export function useOpenCloudRequirement() {
  const { $gettext } = useGettext()

  function getVersionRange({ minOpenCloud, maxOpenCloud }: AppVersion) {
    if (minOpenCloud && maxOpenCloud) {
      return $gettext('OpenCloud %{min} – %{max}', { min: minOpenCloud, max: maxOpenCloud })
    }
    if (minOpenCloud) {
      return $gettext('OpenCloud %{version}+', { version: minOpenCloud })
    }
    if (maxOpenCloud) {
      return $gettext('OpenCloud up to %{version}', { version: maxOpenCloud })
    }
    return ''
  }

  function getRequirementText({ minOpenCloud, maxOpenCloud }: AppVersion) {
    if (minOpenCloud && maxOpenCloud) {
      return $gettext('Requires OpenCloud %{min} to %{max}', {
        min: minOpenCloud,
        max: maxOpenCloud
      })
    }
    if (minOpenCloud) {
      return $gettext('Requires OpenCloud %{version} or newer', { version: minOpenCloud })
    }
    if (maxOpenCloud) {
      return $gettext('Requires OpenCloud %{version} or older', { version: maxOpenCloud })
    }
    return ''
  }

  return { getVersionRange, getRequirementText }
}
