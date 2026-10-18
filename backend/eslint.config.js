// Configuración mínima de ESLint (flat config) para el backend en ES Modules.

export default [
  // Reportes generados por "npm run test:coverage" y "npm run test:funcional" (no son código fuente).
  { ignores: ['coverage/', 'reportes-funcionales/'] },
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
