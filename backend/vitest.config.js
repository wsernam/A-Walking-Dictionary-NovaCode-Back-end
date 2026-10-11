// Configuración de Vitest para las pruebas unitarias del backend (carpeta tests/).
// Las pruebas simulan los repositorios con vi.mock: no necesitan PostgreSQL ni Docker.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Cada prueba arranca sin mocks ni variables de entorno de la anterior.
    restoreMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      reporter: ['text', 'html'],
    },
  },
});
