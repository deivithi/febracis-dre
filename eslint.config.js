import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Sincronização deliberada de estado com URL/modais; a regra é excessivamente estrita para este app.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: [
      'src/components/ui/**/*.{ts,tsx}',
      'src/contexts/**/*.{ts,tsx}',
      'src/layouts/app/BreadcrumbContext.tsx',
      'src/features/export/**/*.{ts,tsx}',
      'src/features/saved-views/SavedViewsBar.tsx',
      'src/features/tour/Tour.tsx',
    ],
    rules: {
      // Primitivos estilo shadcn exportam helpers junto de componentes.
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['api/**/*.ts', 'vite.config.ts'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.node,
    },
  },
])
