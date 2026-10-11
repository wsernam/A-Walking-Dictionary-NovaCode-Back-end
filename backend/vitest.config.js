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
      // Misma lista que sonar.coverage.exclusions (sonar-project.properties), para que el número
      // local coincida con el de SonarQube. Ver la justificación allá.
      exclude: [
        'src/routes/**',
        'src/models/**',
        'src/config/**',
        'src/repositories/**',
        'src/controllers/PreguntaQuizController.js',
        'src/controllers/EtiquetaContextoController.js',
        'src/controllers/RespuestaQuizController.js',
        'src/controllers/ProgresoEstudioController.js',
        'src/controllers/QuizMazoController.js',
      ],
      // lcov: lo lee SonarQube (sonar.javascript.lcov.reportPaths en sonar-project.properties).
      // projectRoot '..' escribe las rutas desde la raíz del repo (backend/src/...), que es desde
      // donde SonarQube las resuelve.
      reporter: ['text', 'html', ['lcov', { projectRoot: '..' }]],
    },
  },
});
