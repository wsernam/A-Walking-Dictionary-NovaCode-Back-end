# Cumplimiento de la guía «Ingeniería de Software: Seguridad y Documentación»

Cómo el proyecto A Walking Dictionary (Grupo 1, Proyecto II) cumple las secciones 1 a 4 de la guía de
referencia técnica: técnicas de testing de seguridad del código fuente, marcos de documentación y
documentación en código. Para cada punto se indica **qué es**, **para qué sirve**, **cómo se implementó**
en el proyecto y **qué parte de la guía cumple**.

Fecha de corte: 2026-11-08. Abarca los dos repositorios:
[back-end](https://github.com/wsernam/A-Walking-Dictionary-NovaCode-Back-end) y
[front-end](https://github.com/knnsand/A-Walking-Dictionary-NovaCode-Front-end).

## Resumen del cumplimiento

| Sección de la guía | Punto | Herramienta / entregable | Estado |
| --- | --- | --- | --- |
| 1-2. Testing de seguridad | SAST | CodeQL + SonarQube Cloud | ✅ Cumplido (en `develop`) |
| | SCA | `npm audit` + Dependabot | ✅ Implementado, pendiente de fusionar |
| | IAST | No aplicado, con justificación | ✅ Justificado |
| | DAST | OWASP ZAP | ✅ Implementado, pendiente de fusionar |
| 3. Marcos de documentación | OpenAPI | `docs/api/openapi.yaml` | ✅ Cumplido (en `develop`) |
| | Arc42 | `docs/arquitectura/arc42/` (12 secciones) | ✅ Implementado, secciones 9-12 pendientes de fusionar |
| | IEEE 1063 / ISO/IEC/IEEE 26514 | Manual de usuario | ❌ Pendiente |
| 4. Documentación en código | JSDoc (JavaScript) | Comentarios + página generada | ✅ Implementado, generación pendiente de fusionar |

«Pendiente de fusionar» significa que el trabajo está terminado en una rama con su Pull Request hacia
`develop` y falta la revisión del equipo. La sección final lista cada rama.

---

## 1 y 2. Técnicas de testing de seguridad del código fuente

La guía pide revisar la seguridad antes de desplegar, combinando cuatro técnicas que miran el sistema
desde ángulos distintos. La tabla de la sección 2 de la guía, con las herramientas del proyecto:

| Técnica | Objeto de análisis | Acceso a código | Momento de aplicación | Herramienta del proyecto |
| --- | --- | --- | --- | --- |
| SAST | Código propio / repositorio | Sí (caja blanca) | Desarrollo / CI/CD | CodeQL, SonarQube Cloud |
| SCA | Bibliotecas de terceros | Sí (archivos de bloqueo) | CI/CD | `npm audit`, Dependabot |
| IAST | Código en ejecución | Sí (agente) | QA / Testing | No aplicado (ver 2.3) |
| DAST | API desplegada / endpoints | No (caja negra) | Pre-producción (entorno de CI) | OWASP ZAP |

Todas corren solas en GitHub Actions: nadie tiene que acordarse de ejecutarlas.

### 2.1 SAST — análisis estático

**Qué es:** revisión de caja blanca que lee el código fuente **sin ejecutarlo** y busca patrones
peligrosos: inyección SQL, XSS, secretos expuestos y malas prácticas.

**Para qué sirve:** detectar vulnerabilidades en el momento en que se escriben, antes de que el código
llegue a `develop`.

**Cómo se implementó:**

| Herramienta | Qué revisa | Cuándo corre | Archivo |
| --- | --- | --- | --- |
| CodeQL (GitHub) | Vulnerabilidades en JavaScript (back y front) | Cada PR y push a `develop`/`main`, y cada lunes para detectar reglas nuevas sobre código que no cambió | `.github/workflows/codeql.yml` (los dos repos) |
| SonarQube Cloud | Bugs, vulnerabilidades, *code smells* y cobertura de pruebas | Cada PR y push, después de las pruebas unitarias | `backend-tests.yml` (back), `ci.yml` (front), `sonar-project.properties` |

Como complemento, la suite OWASP del equipo (`backend/security-suite/`) revisa en el código que las
consultas a la base de datos estén parametrizadas y busca *sinks* peligrosos de XSS en el front.

**Qué cumple de la guía:** SAST sobre «código propio / repositorio directo», con acceso al código y
aplicado en «fase de desarrollo / CI/CD».

### 2.2 SCA — análisis de composición de software

**Qué es:** auditoría automática de las **librerías de terceros** que usa el proyecto (express, pg,
jsonwebtoken, react, etc.) contra las bases públicas de vulnerabilidades conocidas (CVE).

**Para qué sirve:** la mayor parte del código que se ejecuta no lo escribió el equipo. Si se descubre un
fallo en una librería, SCA avisa y propone la versión corregida.

**Cómo se implementó** (Manuela Erazo, en los dos repositorios):

| Herramienta | Qué hace | Cuándo corre | Archivo |
| --- | --- | --- | --- |
| `npm audit --omit=dev` | Revisa las dependencias de producción del `package-lock.json` y deja un resumen en el job | Cada PR, push a `develop`/`main`, cada lunes y manual | `.github/workflows/sca.yml` |
| Dependabot | Abre un PR hacia `develop` cuando hay una actualización de npm (agrupa menores y parches); revisa también las acciones de GitHub cada mes | Cada lunes, 8:00 hora Colombia | `.github/dependabot.yml` |

La suite OWASP del back también corre `npm audit` (control A03) y verifica la integridad del
`package-lock.json` (control A08).

Resultado al 2026-11-08: `npm audit` reporta **0 vulnerabilidades** en las dependencias de producción de
los dos repositorios.

**Qué cumple de la guía:** SCA sobre «bibliotecas y paquetes de terceros», usando los «archivos de
bloqueo» y aplicado en «compilación / CI/CD».

### 2.3 IAST — análisis interactivo (no aplicado, justificado)

**Qué es:** un agente instalado **dentro** de la aplicación observa el flujo de datos mientras se
ejecutan pruebas funcionales.

**Por qué no se aplica:** las herramientas IAST para Node.js (Contrast Security, Seeker, Checkmarx IAST)
son comerciales, piden licencia y un servidor propio, y no hay una alternativa libre mantenida. Para un
proyecto académico sin presupuesto se decidió no aplicarla.

**Cómo se cubre su objetivo de forma parcial:**

- las pruebas funcionales de la API (`backend/pruebas-funcionales/`) y E2E del front (Playwright), que
  recorren los flujos reales de la aplicación en ejecución;
- el middleware `registroSeguridadMiddleware.js` (OWASP H-09), que registra todo 401, 403 y 5xx con
  método, ruta, IP y rol;
- el DAST con ZAP (2.4), que ataca la aplicación en ejecución.

**Qué cumple de la guía:** la técnica queda analizada y su no aplicación documentada, con los controles
que la reemplazan parcialmente.

### 2.4 DAST — análisis dinámico

**Qué es:** prueba de caja negra que **enciende la aplicación y la ataca desde afuera**, como lo haría un
atacante, sin mirar el código.

**Para qué sirve:** encontrar fallos que solo aparecen en ejecución: errores que revelan información,
cabeceras de seguridad faltantes, respuestas inesperadas ante datos maliciosos.

**Cómo se implementó** (William Serna), con OWASP ZAP, la herramienta DAST libre de referencia:

1. GitHub Actions crea una base PostgreSQL **desechable** con `init.sql` + `seed.sql`.
2. Enciende el back-end en modo producción.
3. Firma un token de la docente de prueba para que ZAP ataque también las rutas protegidas.
4. ZAP importa la especificación **OpenAPI** del proyecto (sección 3) y prueba cada endpoint con cientos
   de ataques: inyección SQL, XSS, *path traversal*, inyección de comandos, divulgación de información.
5. Publica un reporte HTML descargable y un resumen en el job.

| Cuándo corre | Archivos |
| --- | --- |
| Push a `develop`, cada lunes y manual | `.github/workflows/dast-zap.yml`, `.zap/rules.tsv`, `docs/seguridad/README.md` |

**Resultado del primer escaneo (2026-11-08):** 178 URLs probadas, **0 fallos y 118 reglas superadas**,
incluidas inyección SQL y XSS. Quedaron 4 avisos de riesgo bajo:

| Aviso | Qué pasa | Decisión |
| --- | --- | --- |
| Respuestas 500 ante datos inválidos | Ids fuera de rango, fechas mal formadas o campos vacíos llegan a la base de datos y la API responde 500 en vez de 400. El mensaje es genérico: no se filtran datos | Pendiente: validación de entrada en los controladores |
| 500 en `/enrichment/family/{word}` | Falta una columna de `wordnet_cache` en `init.sql` (discrepancia D-05 ya conocida) | Pendiente de decisión del equipo |
| 404 en HTML | Una ruta inexistente responde la página HTML por defecto de Express en vez de JSON | Pendiente: manejador 404 en JSON |
| «Format String Error» | Falso positivo: Node.js no interpreta `%n`/`%s` | Ignorado en `.zap/rules.tsv`, con justificación |

El detalle está en `docs/seguridad/README.md`.

**Qué cumple de la guía:** DAST sobre la «aplicación web desplegada / endpoints», sin acceso al código
(caja negra) y aplicado en un entorno equivalente a pre-producción.

---

## 3. Marcos y estándares internacionales de documentación

### 3.1 OpenAPI Specification

**Qué es:** estándar de la industria, en YAML o JSON, para describir una API REST: rutas, métodos,
parámetros, cuerpos, respuestas, errores y seguridad.

**Para qué sirve:** es el contrato entre el back y el front. Herramientas como Swagger UI o Redoc lo
convierten en documentación interactiva, y ZAP lo usa como mapa para el DAST (2.4).

**Cómo se implementó** (Bloque 4): `docs/api/openapi.yaml` en el back-end, versión OpenAPI 3.0.3.

- Documenta los **55 endpoints montados** (auth, mazos, tarjetas, cursos, analítica, estudio, usuarios,
  aportes, quices, enriquecimiento, diccionario y reportes).
- Cada operación trae etiqueta, `operationId`, resumen, descripción, seguridad (pública, opcional o con
  JWT), respuesta de éxito y errores con el formato `{ error, code }`.
- Extensiones propias para trazabilidad: `x-hu` (historia de usuario), `x-ca` (criterios de aceptación)
  y `x-pendiente` (supuestos que el equipo debe validar).
- Se valida con `npx @redocly/cli lint` y se ve con `npx @redocly/cli build-docs`
  (`docs/api/README.md`).

**Qué cumple de la guía:** «definir, estructurar y documentar APIs RESTful de forma interactiva».

### 3.2 Arc42

**Qué es:** plantilla de 12 secciones para documentar y comunicar la arquitectura de software.

**Para qué sirve:** que cualquier integrante nuevo entienda cómo está construido el sistema, por qué se
tomaron las decisiones y qué riesgos hay.

**Cómo se implementó:** `docs/arquitectura/arc42/` en el back-end.

| Secciones | Contenido | Estado |
| --- | --- | --- |
| 1-8 | Introducción y metas, restricciones, contexto y alcance, estrategia de solución, vista de bloques, vista de ejecución, vista de despliegue, conceptos transversales | En `develop` |
| 9-12 | Decisiones de arquitectura, requisitos de calidad, riesgos y deuda técnica, glosario | Rama `docs/arc42-c` (Karen Sandoval), pendiente de fusionar |

**Qué cumple de la guía:** «plantilla limpia y estructurada para la documentación y comunicación de la
arquitectura», con las 12 secciones completas al fusionar.

### 3.3 IEEE 1063 e ISO/IEC/IEEE 26514 — documentación de usuario

**Qué es:** estándares que definen la estructura y el contenido mínimo de la documentación para usuarios:
manuales que explican paso a paso cómo usar el software.

**Estado: pendiente.** La carpeta `docs/usuario/` del front-end está reservada, pero el manual no existe
todavía. Propuesta: empezarlo con las funciones ya terminadas (inicio de sesión, mazos, registro y
aprobación de palabras, diccionario, quices, exportación a PDF) por rol (docente, estudiante e invitado),
marcar lo demás como «en construcción» y completarlo en cada sprint.

**Qué falta para cumplir:** el manual de usuario.

---

## 4. Estándares de documentación en código (in-code docs)

La guía asigna a JavaScript/TypeScript el estándar **JSDoc**. Python (PEP 257), Java (Javadoc) y C#
(XML Comments) no aplican porque el proyecto es solo JavaScript.

### 4.1 Comentarios en el código

**Qué es:** cada archivo, función y constante lleva un comentario `/** ... */` con su descripción,
parámetros, retorno y errores.

**Para qué sirve:** explicar el *por qué* de cada pieza y sus reglas de negocio (HU y CA) junto al código,
como pide el principio de código autodocumentado de la guía.

**Cómo se implementó** (Bloque 3B, en `develop`): los dos repositorios usan el mismo estilo:

```js
/**
 * @file MazoItem.jsx
 * @brief Tarjeta de un mazo de estudio dentro de la lista de mazos.
 */

/**
 * @brief Aprueba una tarjeta pendiente.
 * @param {number} id - Id de la tarjeta.
 * @return {Promise<Object>} La tarjeta aprobada.
 * @throws {Error} Si la tarjeta ya no está pendiente.
 */
```

Cobertura: 94 archivos del back-end y 103 del front-end tienen comentario de archivo, y todas sus
funciones documentadas tienen descripción.

### 4.2 Generación automática de la documentación

**Qué es:** JSDoc lee esos comentarios y **genera sola una página web** con cada archivo, función,
parámetro y descripción.

**Para qué sirve:** cumplir la parte de la guía que pide «generar documentación automática directamente
desde los comentarios del código fuente», sin escribir la documentación dos veces.

**Cómo se implementó** (Bloque 3C, rama `docs/generar-doc-codigo` en los dos repos):

| Pieza | Para qué |
| --- | --- |
| `jsdoc` (dependencia de desarrollo) y `npm run docs:code` | Genera la página en `docs-generados/` (no se sube al repositorio) |
| `jsdoc.json` | Qué carpeta leer (`src`, sin pruebas) y dónde guardar la página |
| `jsdoc/etiquetas.cjs` | Plugin propio que traduce lo que JSDoc no entiende, **sin reescribir los comentarios**: `@brief` pasa a descripción, `@note` y `@warning` a párrafos, y tipos estilo TypeScript (`{ token?: string }`, `() => Promise<void>`, `import('express')`) a sintaxis de JSDoc |
| `docs/codigo/README.md` | Cómo generarla y mantenerla |

Resultado: **0 errores** al generar. 94 archivos en el back y 103 archivos con 247 funciones en el
front, todos con descripción, incluidos los `props` de los componentes React.

**Qué cumple de la guía:** estándar JSDoc para JavaScript (`/** @param {string} name - Nombre */`) con
generación automática de la documentación.

---

## Ramas y Pull Requests

| Repositorio | Rama | Contenido | Estado |
| --- | --- | --- | --- |
| Back | `docs/openapi` | OpenAPI (3.1) | ✅ Fusionada (#52) |
| Back y front | (Bloque 3B) | Comentarios en el código (4.1) | ✅ Fusionada |
| Back y front | `docs/generar-doc-codigo` | Generación con JSDoc (4.2) | Pendiente de fusionar |
| Back | `docs/arc42-c` | Arc42, secciones 9-12 (3.2) | Pendiente de fusionar |
| Back y front | `feature/*/sca-dependencias` | SCA (2.2) | Pendiente de fusionar |
| Back | `feature/dast-zap` | DAST, IAST justificado y este documento (2.3, 2.4) | Pendiente de fusionar |
| Front | — | Manual de usuario (3.3) | Por hacer |
