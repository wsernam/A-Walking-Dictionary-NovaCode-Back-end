// Configuración de Vitest para las pruebas FUNCIONALES (carpeta pruebas-funcionales/).
// A diferencia de las unitarias (vitest.config.js, carpeta tests/), aquí no hay mocks: cada
// prueba hace peticiones HTTP al backend corriendo y este usa una base PostgreSQL real.
// Se ejecutan con "npm run test:funcional"; no cuentan para la cobertura de SonarQube.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['pruebas-funcionales/**/*.test.js'],
    globalSetup: ['pruebas-funcionales/soporte/preparacion-global.js'],
    // Todas las pruebas comparten la misma base de datos: se ejecutan una por una.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    // En GitHub Actions se agrega "github-actions": marca las pruebas fallidas en el PR.
    reporters: ['default', 'html', 'junit', ...(process.env.GITHUB_ACTIONS ? ['github-actions'] : [])],
    outputFile: {
      html: 'reportes-funcionales/index.html',
      junit: 'reportes-funcionales/junit.xml',
    },
  },
});
