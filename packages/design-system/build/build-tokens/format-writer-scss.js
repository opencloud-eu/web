import { sortProps } from './utils.js'

export default {
  name: 'format/ods/scss',
  format: (dictionary) => {
    const props = sortProps(dictionary.allTokens)
    const data = [
      ':host, :root {',
      ...props.map((p) => `  --${p.name}: ${p.value};`),
      '}',
      ''
    ].join('\n')

    return data
  }
}
