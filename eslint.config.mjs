// @ts-check
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**'],
  },

  js.configs.recommended,

  // Type-aware TypeScript rules for all TS sources
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Plain JS config files: no type-aware linting
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
  },

  // Backend (NestJS / Node)
  {
    files: ['backend/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['backend/**/*.spec.ts', 'backend/**/*.e2e-spec.ts'],
    languageOptions: { globals: { ...globals.jest } },
    rules: {
      // Jest asymmetric matchers (expect.any etc.) are typed as `any`
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  // Frontend (React / browser)
  {
    files: ['frontend/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['frontend/vite.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Must be last: disables stylistic rules that conflict with Prettier
  eslintConfigPrettier,
);
