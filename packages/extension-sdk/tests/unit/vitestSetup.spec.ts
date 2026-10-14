import { existsSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { build } from 'vite'

const sdkDir = join(__dirname, '..', '..')
const outDir = join(sdkDir, 'node_modules', '.tmp', 'vitest-setup-spec')

describe('built extension sdk', () => {
  let setupFiles: string[]

  beforeAll(async () => {
    await build({
      root: sdkDir,
      configFile: join(sdkDir, 'vite.config.ts'),
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true }
    })
    const { defineConfig } = await import(pathToFileURL(join(outDir, 'extension-sdk.js')).href)
    setupFiles = defineConfig({ name: 'test' })({ mode: 'test' }).test.setupFiles
  }, 60_000)

  afterAll(() => {
    rmSync(outDir, { recursive: true, force: true })
  })

  it('points the unit test setup to the shipped setup file', () => {
    expect(setupFiles).toEqual([join(outDir, 'vitest.setup.js')])
    expect(existsSync(setupFiles[0])).toBe(true)
  })

  it('adds the base element in the shipped setup file', () => {
    expect(readFileSync(setupFiles[0], 'utf-8')).toContain('createElement("base")')
  })
})
