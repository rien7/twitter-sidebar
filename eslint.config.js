import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'
import betterTailwind from 'eslint-plugin-better-tailwindcss'
import importPlugin from 'eslint-plugin-import'
import importNewLine from 'eslint-plugin-import-newlines'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import eslintReact from "@eslint-react/eslint-plugin";

export default defineConfig([
  globalIgnores(['dist/']),
  {
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      eslintReact.configs['recommended-typescript']
    ],
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        // Enable project service for better TypeScript integration
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@stylistic': stylistic,
      js,
      'react': reactPlugin,
      'simple-import-sort': simpleImportSort,
      'import': importPlugin,
      'import-newlines': importNewLine,
      'better-tailwindcss': betterTailwind,
    },
    settings: {
      'react': {
        version: 'detect',
      },
      'better-tailwindcss': {
        entryPoint: 'src/index.css',
      },
    },
  },
  tseslint.configs.recommended,
  reactHooks.configs['recommended-latest'],
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  stylistic.configs.recommended,
  eslintReact.configs.recommended,
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
      'object-shorthand': ['error'],
      '@stylistic/brace-style': ['error', '1tbs'],
      '@stylistic/max-len': ['error', { code: 130 }],
      '@stylistic/array-element-newline': ['error', 'consistent'],
      'react/display-name': 'off',
      'react/jsx-sort-props': 'error',
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'function-declaration',
          unnamedComponents: 'arrow-function',
        },
      ],
      '@typescript-eslint/consistent-type-definitions': 'error',
      ...betterTailwind.configs['recommended-error'].rules,
      'better-tailwindcss/enforce-consistent-line-wrapping': ['error', {
        printWidth: 130,
      }],
      'better-tailwindcss/enforce-shorthand-classes': 'error',
    },
  },
])
