import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  eslintConfigPrettier,
  {
    ignores: [
      '**/node_modules/',
      '.git/',
      '**/dist/',
      '**/.vitepress/',
      'packages/web-client/src/graph/generated/'
    ]
  },
  {
    languageOptions: {
      ecmaVersion: 5,
      globals: {
        ...globals.browser,
        ...globals.amd,
        require: false,
        requirejs: false
      },
      parserOptions: {
        parser: {
          js: '@babel/eslint-parser',
          ts: '@typescript-eslint/parser',
          vue: 'vue-eslint-parser'
        },
        requireConfigFile: false,
        sourceType: 'module'
      }
    },

    plugins: {
      'unused-imports': unusedImports
    },

    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-extra-semi': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',

      'no-new': 'off',
      'node/no-callback-literal': 'off',
      'prefer-const': 'warn',
      'require-await': 'warn',
      // 'sort-imports': 'warn', TODO: fix project import issues and then enable it
      'unused-imports/no-unused-imports': 'error',
      'no-multiple-empty-lines': ['error', { max: 1 }],
      'no-trailing-spaces': 'error',
      semi: ['error', 'never'],
      'padded-blocks': ['error', 'never'],

      'vue/multi-word-component-names': 'warn',
      'vue/no-multiple-template-root': 'off',
      'vue/no-v-model-argument': 'off',
      'vue/no-v-text-v-html-on-component': 'warn',
      'vue/require-typed-ref': 'error'
    }
  }
]
