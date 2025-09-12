import StyleDictionary from 'style-dictionary'
import path, { dirname } from 'path'
import yaml from 'yaml'
import { fileURLToPath } from 'url'

import jsonFormat from './build-tokens/format-writer-json.js'
import scssFormat from './build-tokens/format-writer-scss.js'
import namespaceTransform from './build-tokens/transform-namespace.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const sd = new StyleDictionary({
  hooks: {
    parsers: {
      'yaml-parser': {
        pattern: /\.yaml$/,
        parser: ({ contents, filePath }) => {
          // This is a bit of a hack to prevent name collisions which would drop the tokens then
          if (filePath.split('/').some((n) => n === 'docs')) {
            const parsed = yaml.parse(contents)

            Object.keys(parsed).forEach((k) => {
              parsed['docs-' + k] = parsed[k]

              delete parsed[k]
            })

            return parsed
          }

          return yaml.parse(contents)
        }
      }
    }
  },
  parsers: ['yaml-parser'],
  source: [path.join(__dirname, '../src/tokens/**/*.yaml')],
  platforms: {
    ods: {
      transforms: ['name/kebab', 'transform/ods/namespace'],
      buildPath: 'src/assets/tokens/',
      files: [
        {
          destination: 'ods.css',
          format: 'format/ods/scss',
          filter: ({ filePath }) => filePath.includes('/ods/')
        },
        {
          destination: 'ods.json',
          format: 'format/ods/json',
          filter: ({ filePath }) => filePath.includes('/ods/')
        }
      ]
    }
  }
})

await sd.hasInitialized
sd.registerFormat(jsonFormat)
sd.registerFormat(scssFormat)
sd.registerTransform(namespaceTransform)
await sd.cleanAllPlatforms()
await sd.buildAllPlatforms()
