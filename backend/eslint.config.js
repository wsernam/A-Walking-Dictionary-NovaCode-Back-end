// Configuración mínima de ESLint (flat config) para el backend en ES Modules.

export default [
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {},
  },
];
