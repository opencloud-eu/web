import type { KnipConfig } from 'knip'
import { parse } from 'vue/compiler-sfc'

/**
 * Knip only enables its built-in Vue compiler in workspaces that list `vue` (or a Vue build plugin)
 * in their own package.json. Most packages here get `vue` from the root, so without this their
 * .vue files are not analyzed and everything imported only from components is reported as unused.
 * Registering the compiler in the config enables it for every workspace.
 * See https://knip.dev/features/compilers#vue
 */
function compileVue(text: string, filename: string) {
  const { descriptor } = parse(text, { filename, sourceMap: false })
  const scripts = [descriptor.script, descriptor.scriptSetup]
    .filter(Boolean)
    .map((block) => (block.src ? `import '${block.src}'` : block.content))
  const styleImports = descriptor.styles.flatMap((block) =>
    block.src
      ? [`import '${block.src}'`]
      : [...block.content.matchAll(/(?<=@)import[^;]+/g)].map(([match]) => match)
  )
  return [...scripts, ...styleImports].join('\n')
}

const config: KnipConfig = {
  compilers: {
    vue: compileVue
  },
  ignoreExportsUsedInFile: {
    interface: true,
    type: true
  },
  ignoreIssues: {
    'packages/design-system/src/**': ['enumMembers', 'duplicates'],
    'packages/web-pkg/src/**': ['enumMembers', 'duplicates'],
    'packages/web-client/src/**': ['enumMembers', 'duplicates']
  },
  vitest: {
    config: ['tests/unit/config/vitest.config.ts']
  },
  workspaces: {
    '.': {
      vite: {
        config: []
      },
      entry: [
        'vite.config.ts',
        'vite.config.common.ts',
        'gettext.config.cjs',
        'release-config.ts',
        'polyfills/*.js',
        'dev/vite-plugins/*.ts',
        'tests/unit/stubs/*.ts'
      ]
    },
    'tests/e2e': {
      entry: ['steps/**/*.ts', 'support/**/*.ts', 'environment/**/*.ts', 'scripts/**/*.{ts,mjs}']
    },
    'packages/design-system': {
      entry: ['docs/.vitepress/**/*.{ts,vue}', 'docs/**/*.vue']
    },
    'services/yjs': {
      entry: ['src/healthcheck.ts']
    },
    'packages/extension-sdk': {
      // vitest.setup.ts is a second lib entry in vite.config.ts that knip can't read from there
      entry: ['src/index.ts', 'src/vitest.setup.ts', 'src/tailwind.css']
    },
    'packages/web-pkg': {
      ignoreDependencies: ['@vue/shared']
    }
  }
}

export default config
