import { describe, it, expect } from 'vitest'
import { externalModules } from '../../../../../extension-sdk/src/externalModules'
import { sharedModules } from '../../../../src/container/application'

describe('sharedModules', () => {
  it('matches externalModules from extension-sdk exactly', () => {
    expect(Object.keys(sharedModules).sort()).toEqual(externalModules.sort())
  })
})
