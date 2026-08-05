import openCloudConfig from '@opencloud-eu/eslint-config'

export default [
  ...openCloudConfig,
  {
    ignores: ['tests/e2e/.features-gen/']
  },
  {
    files: ['packages/design-system/docs/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  }
]
