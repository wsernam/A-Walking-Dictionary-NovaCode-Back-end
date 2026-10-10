import 'dotenv/config';
import { WordnetService } from './src/services/WordnetService.js';

try {
  console.log('=================================');
  console.log('PRUEBA DE WORDNET SERVICE');
  console.log('=================================');

  const resultado =
    await WordnetService.obtenerFamilia('cooking');

  console.dir(resultado, {
    depth: 10,
  });

  console.log('=================================');
  console.log('PRUEBA TERMINADA');
  console.log('=================================');
} catch (error) {
  console.error('ERROR:', error);
  process.exitCode = 1;
}