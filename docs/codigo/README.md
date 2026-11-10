# Documentación del código (generada con JSDoc)

Los comentarios del código de `backend/src/` siguen el estilo Doxygen del proyecto (`@file`, `@brief`,
`@param`, `@return`, `@note`, `@warning`). [JSDoc](https://jsdoc.app/) lee esos comentarios y genera
una página web con cada archivo, función, parámetro y descripción.

## Cómo generarla

Desde `backend/`:

```bash
npm install          # solo la primera vez (instala jsdoc, dependencia de desarrollo)
npm run docs:code
```

Abrir `backend/docs-generados/index.html` en el navegador.

La carpeta `docs-generados/` **no se sube al repositorio** (está en `backend/.gitignore`): cada quien la
genera en su equipo cuando la necesita.

## Archivos de configuración

| Archivo | Para qué sirve |
| --- | --- |
| `backend/jsdoc.json` | Qué carpeta leer (`src`), dónde guardar la página (`docs-generados`) y qué plugins usar |
| `backend/jsdoc/etiquetas.cjs` | Plugin del proyecto: traduce las etiquetas de Doxygen que JSDoc no conoce |
| `backend/jsdoc/INICIO.md` | Texto de la página de inicio del sitio generado |

## Etiquetas de Doxygen que traduce el plugin

Los comentarios **no se reescriben**; el plugin solo cambia cómo se muestran en la página:

| En el código | En la página |
| --- | --- |
| `@brief texto` | Descripción de la función, constante o archivo |
| `@file X.js` | Se quita el nombre del archivo; la descripción del archivo es su `@brief` |
| `@note texto` | Párrafo **Nota:** texto |
| `@warning texto` | Párrafo **Advertencia:** texto |
| `{import('express').Request}` | `{Request}` (JSDoc no entiende tipos de TypeScript) |

## Mantenimiento

- Al agregar o cambiar código, documentarlo con el mismo estilo; la página se actualiza sola al volver a
  correr `npm run docs:code`.
- Si se empieza a usar otra etiqueta de Doxygen, agregarla en `backend/jsdoc/etiquetas.cjs`
  (`definirEtiquetaDeTexto`). Si no, JSDoc la muestra aparte como etiqueta desconocida.
