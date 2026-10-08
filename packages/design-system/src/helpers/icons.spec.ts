import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { hasDarkIconVariant } from './icons'

describe('hasDarkIconVariant', () => {
  it('knows exactly the icons that ship a dark variant', () => {
    const suffix = '-dark-fill.svg'
    const files = readdirSync(resolve(__dirname, '../assets/icons'))
    const iconsWithDarkFile = files
      .filter((file) => file.endsWith(suffix))
      .map((file) => file.slice(0, -suffix.length))
    const iconNames = files.map((file) => file.replace(/(-fill|-line)?\.svg$/, ''))

    expect(iconsWithDarkFile.length).toBeGreaterThan(0)
    expect(iconNames.filter((name) => hasDarkIconVariant(name)).sort()).toEqual(
      [...new Set(iconsWithDarkFile)].sort()
    )
  })
})
