import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const WordNet = require('node-wordnet');
const wndb = require('wordnet-db');

console.log('WordNet DB:', wndb.version);
console.log('Ruta:', wndb.path);

const wordnet = new WordNet(wndb.path);

try {
  const resultados = await wordnet.lookupAsync('cooking');

  console.log('\nResultados para "cooking":');
  console.dir(resultados, { depth: 6 });

  wordnet.close();
} catch (error) {
  console.error('Error consultando WordNet:', error);
  process.exitCode = 1;
}