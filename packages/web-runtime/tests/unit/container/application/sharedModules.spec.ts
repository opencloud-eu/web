import { describe, it, expect } from 'vitest'
import { externalModules } from '../../../../../extension-sdk/src/externalModules'
import { sharedModules, lazySharedModules } from '../../../../src/container/application'

describe('sharedModules', () => {
  it('matches externalModules from extension-sdk exactly', () => {
    expect([...Object.keys(sharedModules), ...Object.keys(lazySharedModules)].sort()).toEqual(
      externalModules.sort()
    )
  })
})
