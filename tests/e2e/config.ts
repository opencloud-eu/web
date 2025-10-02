import { config as jsConfig } from './config.js'

// re-export js config as ts config to please typescript compiler.
// otherwhise we would need to ignore all config imports in ts files.
const config = jsConfig as any

export { config }
