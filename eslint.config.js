import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'
import importPlugin from 'eslint-plugin-import'
import importNewLine from 'eslint-plugin-import-newlines'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist/']),
  {
    extends: ['js/recommended'],
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: {
      '@stylistic': stylistic,
      js,
      'react': reactPlugin,
      'simple-import-sort': simpleImportSort,
      'import': importPlugin,
      'import-newlines': importNewLine,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  tseslint.configs.recommended,
  reactHooks.configs['recommended-latest'],
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  stylistic.configs.recommended,
  {
    rules:
    {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import-newlines/enforce': ['error', {
        'items': 8,
        'max-len': 130,
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@stylistic/brace-style': ['error', '1tbs'],
      'react/display-name': 'off',
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'function-declaration',
          unnamedComponents: 'arrow-function',
        },
      ],
    },
  },
])
