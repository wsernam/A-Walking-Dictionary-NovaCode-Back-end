/**
 * @file etiquetas.cjs
 * @brief Plugin de JSDoc del proyecto (lo carga jsdoc.json). Solo afecta la página que genera
 * "npm run docs:code"; no cambia el código ni cómo se ejecuta.
 *
 * Los comentarios del proyecto siguen el estilo Doxygen (ver docs/README.md). JSDoc no conoce
 * algunas de sus etiquetas, así que este plugin las traduce sin reescribir los comentarios:
 * 1. @brief: su texto pasa a ser la descripción de la función, constante o archivo.
 * 2. @file X.js: en Doxygen el valor es el nombre del archivo, no una descripción; se quita para
 *    que la descripción del archivo sea la de su @brief.
 * 3. @note y @warning: se agregan a la descripción como "Nota: ..." y "Advertencia: ...".
 * 4. Tipos con import(): {import('express').Request} se simplifica a {Request}, porque el
 *    analizador de tipos de JSDoc no entiende la sintaxis de TypeScript.
 * 5. @class X: se quita, porque JSDoc ya reconoce las clases de ES6 y con la etiqueta las
 *    duplica (Aporte.html y Aporte_Aporte.html).
 * 6. Objetos exportados (export const XService = {...}): se marcan como @namespace para que
 *    JSDoc muestre sus funciones; sin comentario propio las ocultaba.
 * 7. Contexto del archivo: la página de cada objeto exportado (@namespace) muestra también la
 *    descripción de su archivo, que es donde está la HU y el detalle.
 */

const path = require('node:path');

/**
 * @brief Agrega un párrafo al final de la descripción de un doclet.
 * @param {Object} doclet - Elemento documentado por JSDoc.
 * @param {string} texto - Párrafo a agregar.
 */
function agregarDescripcion(doclet, texto) {
  doclet.description = doclet.description ? `${doclet.description}\n\n${texto}` : texto;
}

/**
 * @brief Registra una etiqueta que agrega su texto, con un prefijo, a la descripción.
 * @param {Object} diccionario - Diccionario de etiquetas de JSDoc.
 * @param {string} nombre - Nombre de la etiqueta (sin @).
 * @param {string} prefijo - Texto en negrita que se antepone ('' para ninguno).
 */
function definirEtiquetaDeTexto(diccionario, nombre, prefijo) {
  diccionario.defineTag(nombre, {
    mustHaveValue: true,
    onTagged(doclet, tag) {
      // En los archivos, "@file app.js" deja "app.js" como descripción: se reemplaza por el @brief.
      if (nombre === 'brief' && doclet.kind === 'file' && doclet.description) {
        const soloNombre = doclet.description.trim();
        if (/^[\w.-]+\.(c?js|jsx|mjs)$/.test(soloNombre)) doclet.description = '';
      }
      agregarDescripcion(doclet, prefijo ? `**${prefijo}:** ${tag.value}` : tag.value);
    },
  });
}

/**
 * @brief Marca como @namespace cada "export const X = { ... }" (servicios, controladores,
 * repositorios). Sin un comentario propio, JSDoc oculta las funciones del objeto; con la marca
 * aparecen en su página. Si el objeto ya tiene comentario, se le agrega la etiqueta.
 * @param {string} codigo - Código fuente del archivo.
 * @return {string} El código con las marcas.
 */
function marcarObjetosExportados(codigo) {
  const lineas = codigo.split('\n');
  for (let i = 0; i < lineas.length; i++) {
    if (!/^export const [\w$]+ = \{/.test(lineas[i])) continue;
    let anterior = i - 1;
    while (anterior >= 0 && lineas[anterior].trim() === '') anterior--;
    if (anterior < 0 || !lineas[anterior].trim().endsWith('*/')) {
      lineas[i] = `/** @namespace */ ${lineas[i]}`;
      continue;
    }
    let inicio = anterior;
    while (inicio > 0 && !lineas[inicio].includes('/**')) inicio--;
    const comentario = lineas.slice(inicio, anterior + 1).join('\n');
    if (!comentario.includes('@namespace')) {
      lineas[anterior] = lineas[anterior].replace(/\*\/\s*$/, '\n * @namespace\n */');
    }
  }
  return lineas.join('\n');
}

exports.handlers = {
  beforeParse(e) {
    e.source = e.source
      .replace(/import\((['"])[^'"]+\1\)\./g, '')
      // "@class X" encima de "class X {...}" hace que JSDoc cree la clase dos veces
      // (una por la etiqueta y otra por el código); la clase ya se detecta sola.
      .replace(/^[ \t]*\*[ \t]*@class[ \t]+[\w$]+[ \t]*\r?\n/gm, '');
    e.source = marcarObjetosExportados(e.source);
  },

  parseComplete(e) {
    const rutaDe = (d) => path.join(d.meta.path, d.meta.filename);
    const descripcionArchivo = new Map(
      e.doclets
        .filter((d) => d.kind === 'file' && d.description)
        .map((d) => [rutaDe(d), d.description]),
    );
    for (const d of e.doclets) {
      const delArchivo = d.kind === 'namespace' && descripcionArchivo.get(rutaDe(d));
      if (delArchivo && !d.description?.includes(delArchivo)) agregarDescripcion(d, delArchivo);
    }
  },
};

exports.defineTags = function defineTags(diccionario) {
  definirEtiquetaDeTexto(diccionario, 'brief', '');
  definirEtiquetaDeTexto(diccionario, 'note', 'Nota');
  definirEtiquetaDeTexto(diccionario, 'warning', 'Advertencia');
};
