import { describe, it, expect } from 'vitest'
// @ts-expect-error — no type declaration for .mjs, not worth shipping one for a test
import { externalModules } from '../../../../../extension-sdk/externalModules.mjs'
import { sharedModules } from '../../../../src/container/application'

describe('sharedModules', () => {
  it('matches externalModules from extension-sdk exactly', () => {
    expect(Object.keys(sharedModules).sort()).toEqual(externalModules.sort())
  })
})
