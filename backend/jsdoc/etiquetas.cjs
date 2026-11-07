/**
 * Plugin de JSDoc del proyecto (lo carga jsdoc.json). Solo afecta la página generada con
 * "npm run docs"; no cambia el código ni cómo se ejecuta.
 *
 * 1. Tipos con import(): los comentarios usan tipos de TypeScript como
 *    {import('express').Request}, que el analizador de tipos de JSDoc no entiende y marca como
 *    error. Antes de analizar cada archivo se simplifican a {Request}.
 * 2. Etiqueta @note: no es estándar de JSDoc. Se registra como etiqueta propia y su texto se
 *    agrega a la descripción como "Nota: ...", para que se vea en la página.
 * 3. Contexto del archivo: la página de cada controlador, servicio o repositorio (@namespace)
 *    muestra también la descripción de su archivo (@file), que es donde está la HU y el detalle.
 */

const path = require('node:path');

exports.handlers = {
  beforeParse(e) {
    e.source = e.source.replace(/import\((['"])[^'"]+\1\)\./g, '');
  },

  parseComplete(e) {
    const rutaDe = (d) => path.join(d.meta.path, d.meta.filename);
    const descripcionArchivo = new Map(
      e.doclets.filter((d) => d.kind === 'file' && d.description).map((d) => [rutaDe(d), d.description]),
    );
    for (const d of e.doclets) {
      const delArchivo = d.kind === 'namespace' && descripcionArchivo.get(rutaDe(d));
      if (delArchivo) d.description = `${d.description || ''}${delArchivo}`;
    }
  },
};

exports.defineTags = function defineTags(diccionario) {
  diccionario.defineTag('note', {
    mustHaveValue: true,
    onTagged(doclet, tag) {
      const nota = `**Nota:** ${tag.value}`;
      doclet.description = doclet.description ? `${doclet.description}\n\n${nota}` : nota;
    },
  });
};
