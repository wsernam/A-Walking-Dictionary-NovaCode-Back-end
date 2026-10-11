// Configuración mínima de ESLint (flat config) para el backend en ES Modules.

export default [
  // Reporte de cobertura generado por "npm run test:coverage" (no es código fuente).
  { ignores: ['coverage/'] },
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
