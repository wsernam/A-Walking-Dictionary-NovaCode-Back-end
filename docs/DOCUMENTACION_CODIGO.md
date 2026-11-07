# Documentación del código (in-code docs) — Back-end

Este documento explica cómo está documentado el código fuente del back-end (`backend/src/`), qué convención se sigue al escribir comentarios, cómo se genera la página de documentación y con qué estándares y buenas prácticas cumple el proyecto.

Fecha: 2026-11-06. Rama: `docs/documentacion-codigo`.

## 1. Qué se implementó

La documentación del proyecto está organizada en cuatro niveles:

| Nivel | Para quién | Dónde |
| --- | --- | --- |
| 1. Comentarios en el código (JSDoc) y la página generada con ellos | Desarrolladores que leen o modifican el código | `backend/src/**/*.js` → `npm run docs` |
| 2. Documentación del repositorio | Quien llega al repositorio por primera vez o quiere contribuir | `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md` |
| 3. Documentación técnica y de la API | Equipo de back-end y de front-end | `docs/` (contratos, flujos, códigos de error, decisiones) |
| 4. Documentación de usuario | Docente y estudiantes | Repositorio del front-end (`docs/usuario/`), pendiente |

Este documento cubre el **nivel 1**. Los niveles 2 y 3 están indexados en [`docs/README.md`](README.md).

### Estándar elegido: JSDoc

El código se documenta con **[JSDoc](https://jsdoc.app/)**, el estándar de documentación de JavaScript. Antes los comentarios mezclaban la sintaxis de JSDoc con etiquetas de Doxygen (`@brief`, `@class`), que es el estándar de C/C++. Se eligió JSDoc por cuatro razones:

- **Es la herramienta propia del lenguaje del proyecto** (Node.js).
- **Entiende el código tal como está escrito:** módulos ES (`import`/`export`), `async` y objetos exportados. Doxygen no lee JavaScript moderno sin un filtro externo.
- **Se instala con npm** como dependencia de desarrollo, sin programas aparte.
- **Casi todos los comentarios ya usaban etiquetas de JSDoc** (`@param`, `@returns`, `@throws`).

### Estado actual del código

**Los 107 archivos `.js` de `backend/src/` están documentados, y también los 242 métodos de sus controladores, servicios y repositorios.**

| Carpeta | Archivos | Documentados |
| --- | --- | --- |
| `controllers/` | 22 | 22 |
| `services/` | 23 | 23 |
| `repositories/` | 20 | 20 |
| `models/` | 14 | 14 |
| `routes/` | 21 | 21 |
| `middleware/` | 3 | 3 |
| `utils/` | 2 | 2 |
| `config/` y `app.js` | 2 | 2 |
| **Total** | **107** | **107** |

Uso de etiquetas en `backend/src/` (conteo del 2026-11-06):

| Etiqueta | Usos | Etiqueta | Usos |
| --- | --- | --- | --- |
| `@file` | 107 | `@throws` | 27 |
| `@namespace` | 62 | `@note` | 85 |
| `@param` | 558 | `@see` | 1 |
| `@returns` / `@return` | 162 | `@brief` (Doxygen) | 0 |

### Cómo se llegó aquí

1. La mayoría de los archivos se documentaron a medida que se implementaba cada historia de usuario.
2. El PR #48 (`docs/doxygen-backend`) documentó los 35 archivos que no tenían comentarios: todas las rutas, casi todos los modelos y varios controladores y servicios.
3. En esta rama (`docs/documentacion-codigo`):
   - Se agregó la cabecera de archivo a los 16 archivos que solo tenían comentarios de línea (`//`) o ninguna cabecera.
   - Se convirtieron las etiquetas de Doxygen a JSDoc: los 454 `@brief` se quitaron (en JSDoc la descripción es el texto que va antes de la primera etiqueta) y los 14 `@class` sobraban, porque JSDoc detecta las clases solo.
   - Se agregó un comentario con `@namespace` a los 62 objetos exportados (controladores, servicios y repositorios). Sin él, JSDoc no les crea página.
   - Se documentaron los 38 métodos que no tenían comentario y se corrigieron dos comentarios que estaban sobre la función equivocada en `TarjetaRepository.js`.
   - Se configuró JSDoc (`npm run docs`).

En todos estos pasos solo cambiaron comentarios y espacios en blanco; ninguna línea de código se modificó. Las 514 pruebas unitarias siguen pasando.

## 2. Cómo generar y ver la documentación

Desde `backend/`:

```bash
npm install      # solo la primera vez
npm run docs
```

La página queda en `backend/docs-generados/index.html`; se abre con doble clic o arrastrándola al navegador. Muestra:

- **Inicio:** una portada con la arquitectura por capas (`backend/jsdoc/INICIO.md`).
- **Namespaces:** una página por cada controlador, servicio y repositorio, con sus métodos, parámetros, tipos, valores de retorno, errores y notas.
- **Classes:** los modelos de dominio (una clase por tabla del DER).
- **Global:** las funciones y constantes que se exportan sueltas.
- **Código fuente:** cada archivo con números de línea, enlazado desde cada método.

La carpeta `docs-generados/` no se sube a Git (está en `.gitignore`), porque se regenera con un comando cuando se quiera.

### Archivos de configuración

| Archivo | Qué hace |
| --- | --- |
| `backend/jsdoc.json` | Configuración de JSDoc: lee `src/`, escribe en `docs-generados/` y usa los plugins |
| `backend/jsdoc/etiquetas.cjs` | Plugin del proyecto (ver abajo) |
| `backend/jsdoc/INICIO.md` | Portada de la página generada |
| `backend/package.json` | Script `npm run docs` y la dependencia de desarrollo `jsdoc` |

El plugin `etiquetas.cjs` solo afecta la página generada, no el código ni cómo se ejecuta. Hace tres cosas:

1. **Entiende los tipos con `import()`.** Tipos como `{import('express').Request}`, que vienen de TypeScript y se usan en 27 archivos, se muestran como `Request`. Sin el plugin, JSDoc los marca como error.
2. **Muestra `@note`.** JSDoc no trae esta etiqueta; el plugin la registra y la muestra como «**Nota:** …».
3. **Agrega el contexto del archivo.** La página de cada controlador, servicio o repositorio muestra también la descripción de su archivo (`@file`), que es donde están la HU y el detalle.

## 3. Convención para escribir comentarios

### 3.1 Etiquetas

| Etiqueta | Uso |
| --- | --- |
| `@file` | Cabecera del archivo: qué hace y qué HU implementa |
| (sin etiqueta) | La descripción de la función: el primer texto del comentario |
| `@param {tipo} nombre - descripción` | Cada parámetro. Si es un objeto: `@param {Object} datos` y una línea `@param {tipo} datos.campo` por propiedad. Los opcionales van entre corchetes: `[datos.rol="estudiante"]` |
| `@returns {tipo} descripción` | Qué devuelve. En los controladores, los códigos HTTP posibles (en el `@param` de `res`) |
| `@throws` | Errores que lanza la función |
| `@namespace` | En el objeto exportado de cada controlador, servicio o repositorio |
| `@note` | Decisiones, restricciones, supuestos pendientes o hallazgos de auditoría |
| `@see` | Referencia a otro documento o archivo |

Los tipos usan la sintaxis de JSDoc: `{string}`, `{number[]}`, `{Promise<Usuario|null>}`, `{Object}`. No se permite sintaxis exclusiva de TypeScript como `campo?: tipo` ni uniones sin paréntesis dentro de un objeto, porque JSDoc no las entiende. `npm run docs` muestra un `ERROR` si encuentra una.

### 3.2 Qué se documenta en cada tipo de archivo

| Archivo | Qué debe tener |
| --- | --- |
| **Todos** | Cabecera `@file` con la responsabilidad del archivo y la HU que implementa |
| **routes/** | Por cada ruta: verbo, ruta completa, rol requerido y HU/CA |
| **controllers/** | `@namespace` en el objeto y, por cada método, qué valida, qué CA cubre y los códigos HTTP que responde |
| **services/** | `@namespace` y, por cada función pública, la regla de negocio, parámetros, retorno y errores |
| **repositories/** | `@namespace` y, por cada consulta, qué devuelve y cuándo devuelve `null` |
| **models/** | Descripción de la clase y un `@param` por columna, con tipo y longitud según `init.sql` |

### 3.3 Ejemplo

Tomado de [`backend/src/repositories/UsuarioRepository.js`](../backend/src/repositories/UsuarioRepository.js):

```js
/**
 * @file Repositorio de Usuario: acceso a datos para la tabla "usuario" del DER oficial.
 */

/**
 * Repositorio: consultas SQL a PostgreSQL.
 * @namespace
 */
export const UsuarioRepository = {
  /**
   * Busca un usuario por correo, sin distinguir mayúsculas de minúsculas (lo usan el login, el
   * registro con Google y la asignación de estudiantes a un curso por correo).
   * @param {string} email - Correo a buscar.
   * @returns {Promise<Usuario|null>} El usuario, o null si no hay ninguno con ese correo.
   */
  async obtenerPorEmail(email) { ... },
};
```

### 3.4 Reglas al escribir comentarios

1. **Explicar el porqué, no el qué.** El código ya dice qué hace. El comentario explica la regla de negocio, la decisión o el riesgo.
2. **Citar la trazabilidad**: HU, CA, decisión del equipo (`CLAUDE.md`) o hallazgo OWASP (por ejemplo `CA-1.1.2`, `Auditoría OWASP H-11`).
3. **Comentarios en español**, igual que los nombres de funciones y variables. Los códigos de error (`code`) van en inglés, según [`codigos-error.md`](codigos-error.md).
4. **El comentario va justo encima de su función.** Si se mueve o se borra una función, su comentario se mueve o se borra con ella.
5. **Actualizar el comentario en el mismo commit que cambia el código.** Un comentario desactualizado es peor que no tener ninguno.
6. **Marcar los supuestos** como `PENDIENTE DE CONFIRMAR` o `supuesto pendiente de validar`, según la regla de `CLAUDE.md`.

### 3.5 Código autodocumentado

Los comentarios complementan un código que ya es legible por sí mismo:

- **Nombres descriptivos en español**, como `esDuenoDelMazo()`, `obtenerPorCursoYEstudiante()` o `inscribirsePorCodigo()`.
- **Constantes con nombre** en lugar de valores sueltos: `ESTADOS_VALIDOS`, `DOMINIO_INSTITUCIONAL`, `MIN_TRADUCCIONES_DISTINTAS`.
- **Arquitectura por capas** (`routes` → `controllers` → `services` → `repositories` → `models`): el nombre y la carpeta de un archivo ya dicen su responsabilidad.
- **Pruebas como documentación ejecutable**: `backend/tests/` (Vitest) y `backend/pruebas-funcionales/`, organizadas por CA.

### 3.6 Lista de chequeo para código nuevo

Antes de abrir un Pull Request:

- [ ] El archivo nuevo tiene cabecera `@file` con la HU.
- [ ] El objeto exportado (controlador, servicio o repositorio) tiene `@namespace`.
- [ ] Cada función exportada tiene descripción, `@param` y `@returns`, y `@throws` si lanza errores.
- [ ] Los controladores indican los códigos HTTP que responden.
- [ ] Las decisiones y los supuestos están en `@note`.
- [ ] `npm run docs` termina sin líneas `ERROR`.
- [ ] Si cambió un endpoint, se actualizó su contrato en `docs/` y `CHANGELOG.md` (ver [`CONTRIBUTING.md`](../CONTRIBUTING.md), sección 7).

## 4. Estándares con los que cumple

| Estándar / buena práctica | Qué pide | Cumplimiento | Evidencia |
| --- | --- | --- | --- |
| **JSDoc 4** (estándar de documentación de JavaScript) | Bloques `/** */` con descripción, `@param {tipo}`, `@returns`, `@throws`; página generada a partir de ellos | **Cumple.** `@note` es una etiqueta propia, registrada con un plugin como permite JSDoc | 107/107 archivos, 242/242 métodos, `npm run docs` sin errores |
| **Código autodocumentado** (*Clean Code*, R. C. Martin; *Code Complete*, S. McConnell) | Nombres que revelan intención, funciones con una responsabilidad, constantes con nombre, comentarios que explican el porqué | **Cumple** | Sección 3.5 |
| **README** (guías *Make a README* y *Standard Readme*) | Descripción, instalación, uso, configuración, pruebas, contribución | **Cumple** | [`README.md`](../README.md): instalación con o sin Docker, variables de entorno, scripts, login y enlaces |
| **Archivos de comunidad de GitHub** | `CONTRIBUTING`, `SECURITY`, plantilla de PR | **Cumple** | [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`SECURITY.md`](../SECURITY.md), `.github/pull_request_template.md` |
| **Keep a Changelog 1.1.0** | Historial de cambios agrupado en Agregado, Cambiado, Corregido y Seguridad | **Cumple** | [`CHANGELOG.md`](../CHANGELOG.md) |
| **Conventional Commits** | Mensajes `tipo(alcance): descripción` | **Cumple** | `CONTRIBUTING.md`, sección 4 |
| **ISO/IEC/IEEE 26514:2022** (información para usuarios, antes IEEE 1063) | Documentación de usuario independiente del código: manuales y guías | **No aplica al código.** Su lugar es el repositorio del front-end y está pendiente | `docs/README.md`, «Estado de los marcos de documentación» |
| **OpenAPI 3** (especificación de la API REST) | Contrato de los endpoints en formato estándar | **Pendiente.** Hoy lo cubren los contratos en Markdown y las colecciones de Postman | `docs/CONTRATO_*.md`, `*.postman_collection*` |

### Sobre ISO/IEC/IEEE 26514

La norma ISO/IEC/IEEE 26514 regula la información **para los usuarios finales** del software, no los comentarios del código fuente. Por eso es independiente del código. En este proyecto, a esta norma le corresponden los manuales de la docente y de los estudiantes, planificados en el repositorio del front-end. Del back-end solo aplican sus principios generales: información orientada a quien la usa, estructura consistente y documentación mantenida junto con el producto. Esos principios se reflejan en los niveles 2 y 3.

## 5. Pendientes

| # | Pendiente | Tipo |
| --- | --- | --- |
| 1 | Agregar `eslint-plugin-jsdoc` para que `npm run lint` avise cuando una función exportada no tiene documentación. | Requiere aprobar una dependencia nueva (`CLAUDE.md`) |
| 2 | Generar la página en el CI (GitHub Actions) y publicarla, por ejemplo en GitHub Pages, para no tener que generarla en local. | Mejora opcional |
| 3 | Escribir la especificación OpenAPI en `docs/api/openapi.yaml`. | Pendiente en `docs/README.md` |
| 4 | Agregar `@example` a las funciones de los servicios con reglas no obvias (SM-2, inscripción por código). | Mejora opcional |
| 5 | Manuales de usuario según ISO/IEC/IEEE 26514 en el repositorio del front-end. | Front-end |
| 6 | Al fusionar `feature/docente-inicial`, quitar el `@brief` de `crearDesdeGoogleConRolInicial` en `UsuarioRepository.js`, porque esa rama se escribió antes de este cambio. | Al fusionar |
