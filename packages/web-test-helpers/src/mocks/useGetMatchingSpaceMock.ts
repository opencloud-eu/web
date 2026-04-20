import { mock } from 'vitest-mock-extended'
import { useGetMatchingSpace } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'

export const useGetMatchingSpaceMock = (
  options: Partial<ReturnType<typeof useGetMatchingSpace>> = {}
): ReturnType<typeof useGetMatchingSpace> => {
  return {
    getInternalSpace() {
      return mock<SpaceResource>()
    },
    getMatchingSpace() {
      return mock<SpaceResource>()
    },
    isPersonalSpaceRoot() {
      return false
    },
    ...options
  }
}
