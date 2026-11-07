// Configuración mínima de ESLint (flat config) para el backend en ES Modules.

export default [
  // Reportes generados por "npm run test:coverage" y "npm run test:funcional", y la página de
  // "npm run docs" (no son código fuente).
  { ignores: ['coverage/', 'reportes-funcionales/', 'docs-generados/'] },
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
