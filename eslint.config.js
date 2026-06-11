import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

const strictTypeScriptSource = [
  'src/backend/**/*.{ts,tsx}',
  'src/frontend/features/jarvishAgent/**/*.{ts,tsx}',
]

const strictReactSource = [
  'src/frontend/features/jarvishAgent/**/*.{ts,tsx}',
]

export default defineConfig([
  globalIgnores([
    'dist/**',
    'src/backend/weaviate_data/**',
    'src/backend/graphql/__generated__/**',
    'src/frontend/features/jarvishAgent/graphql/__generated__/**',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx}'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-fallthrough': 'warn',
      'prefer-const': 'warn',
      'require-yield': 'off',
      'react-refresh/only-export-components': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    files: strictTypeScriptSource,
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: strictReactSource,
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
    },
  },
])
