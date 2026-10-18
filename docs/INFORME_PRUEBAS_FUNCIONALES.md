# Informe de pruebas funcionales

**Proyecto:** A Walking Dictionary · **Fecha de corte:** 2026-10-18 · **Rama medida:** `develop` (back y front)
**Responsable:** William Serna

Resultados de la suite de pruebas funcionales del sistema. La suite verifica los criterios de aceptación (CA) del backlog contra el sistema completo: frontend, backend y PostgreSQL reales. Tiene dos partes:

| Suite | Repositorio | Herramienta | Qué prueba | Workflow de CI |
|---|---|---|---|---|
| **API** | Back (`backend/pruebas-funcionales/`) | Vitest | Peticiones HTTP reales al backend con PostgreSQL | `Backend pruebas funcionales` (`.github/workflows/funcionales.yml`) |
| **E2E** | Front (`e2e/`) | Playwright | Un navegador real que usa la aplicación como docente, estudiante o invitado | `Frontend pruebas E2E` (`.github/workflows/e2e.yml`) |

---

## 1. Resumen

| Métrica | API | E2E |
|---|---|---|
| Cobertura de criterios de aceptación | **34 / 37 (91,9 %)** | **29 / 37 (78,4 %)** |
| Tasa de éxito | **82 / 82 (100 %)** | **31 / 33 (93,9 %)** |
| Pruebas pendientes (no ejecutadas) | 4 | 3 |
| Errores conocidos (fallo esperado) | 0 | 2 |
| Estabilidad (dos ejecuciones seguidas, mismo resultado) | ✅ | ✅ |
| Duración aproximada | ~2 s | ~35 s |

- **Defectos encontrados por la suite:** 7, de los cuales 1 está corregido (ver sección 6).
- **CA sin ninguna prueba automática:** 3 de 37. Son CA-2.1.3 (no implementado), CA-3.3.3 (revisión visual) y CA-5.1.1 (requiere cuenta real de Google).

## 2. Cómo se mide

| Métrica | Fórmula | Qué responde |
|---|---|---|
| **Cobertura de criterios de aceptación** | CA con al menos una prueba automática ÷ CA en alcance | ¿Qué parte del backlog está probada? |
| **Tasa de éxito** | Pruebas que pasan ÷ pruebas ejecutadas | ¿El sistema cumple lo que está probado? |
| **Defectos encontrados** | Conteo, con severidad y estado | ¿La suite sirve para detectar errores? |

- **Alcance:** los 37 CA de las HU implementadas. Se excluyen HU-4.1 y HU-4.2 (estado "Pendiente" en el backlog) y el diccionario global, que todavía no está en el backlog oficial.
- **Cuándo cuenta como probado:** un CA cuenta como probado si su estado es *cubierto*, *parcial* o *con error*, es decir, si tiene una prueba que lo verifica aunque hoy detecte un defecto.
- **Trazabilidad:** cada prueba empieza su nombre por el CA que cubre (por ejemplo `CA-1.2.3 Mazo cerrado: se rechaza el aporte`). La matriz de la sección 4 se construye a partir de esos nombres.
- **Pruebas pendientes:** las marcadas `todo` (Vitest) o `fixme` (Playwright) no se ejecutan. Se reportan aparte y no cuentan en la tasa de éxito.
- **Errores conocidos:** las marcadas `test.fail` (Playwright) describen el comportamiento correcto y hoy fallan por un defecto abierto. No cuentan como éxito. El CI sigue en verde y Playwright avisa cuando el defecto se corrige.

## 3. Ejecuciones

Última ejecución en GitHub Actions sobre `develop`, el 2026-10-18:

| Suite | Ejecutadas | Pasan | Errores conocidos | Pendientes | Resultado | Ejecución |
|---|---|---|---|---|---|---|
| API | 82 | 82 | 0 | 4 | ✅ | [run 39100020820](https://github.com/wsernam/A-Walking-Dictionary-NovaCode-Back-end/actions/runs/39100020820) |
| E2E | 33 | 31 | 2 | 3 | ✅ | [run 39144873192](https://github.com/knnsand/A-Walking-Dictionary-NovaCode-Front-end/actions/runs/39144873192) |

Cada ejecución genera además un **resumen automático en Markdown**, con totales, tasa de éxito, cobertura de CA calculada desde los nombres de las pruebas, pruebas por HU y las que fallaron. El resumen aparece en la página de la ejecución en GitHub Actions y se guarda como `RESUMEN.md` dentro del artefacto, junto al reporte HTML. Los artefactos se descargan desde la sección **Artifacts**: `reporte-pruebas-funcionales` para la API y `reporte-pruebas-e2e` para el E2E, y se conservan 30 días.

Este informe consolida las dos suites en una fecha de corte y agrega lo que no sale automáticamente: los estados *parcial*, el motivo de cada CA sin cubrir y la severidad de los defectos.

### Flujo de cada ejecución

```
Push o Pull Request a develop / main
        │
        ▼
GitHub Actions
  1. Levanta PostgreSQL 16 como servicio
  2. Arranca el backend (el workflow del front lo descarga de su repositorio)
  3. Arranca el frontend (solo E2E)
  4. Reinicia la base con init.sql + seed.sql
  5. Simula el login: firma el mismo JWT que emite el backend
  6. Ejecuta las pruebas
  7. Publica el reporte HTML y JUnit como artefacto
        │
        ▼
✅ / ❌ en el Pull Request
```

- **Login:** el inicio de sesión real es con Google y no se puede automatizar. Las pruebas firman el JWT con `JWT_SECRET` y el mismo payload que `AutenticacionService.emitirSesion` (`{ id_usuario, email, rol }`), para los usuarios de `seed.sql`.
- **Base de datos:** se reinicia antes de cada ejecución para que el resultado sea repetible. Nunca se usa Supabase ni Render.

## 4. Matriz de trazabilidad

**Leyenda:**
- ✅ cubierto
- 🟡 parcial
- ❌ la prueba existe y detecta un defecto abierto
- ⬜ sin prueba automática (con el motivo)

### HE-01 — Mazos y vocabulario

| CA | Criterio | API | E2E |
|---|---|---|---|
| CA-1.1.1 | Creación exitosa del mazo | ✅ | ✅ |
| CA-1.1.2 | Validación de datos obligatorios | ✅ | ✅ |
| CA-1.1.3 | Control de estado del mazo | ✅ | ✅ |
| CA-1.2.1 | Registro exitoso de palabra | ✅ | ✅ |
| CA-1.2.2 | Validación de campos obligatorios | ✅ | ✅ |
| CA-1.2.3 | Bloqueo por mazo cerrado | ✅ | ✅ |
| CA-1.3.1 | Duplicado exacto (coautoría) | ✅ | ✅ |
| CA-1.3.2 | Duplicado parcial (acepción nueva) | ✅ | ✅ |
| CA-1.3.3 | Insensible a mayúsculas | ✅ | ✅ |
| CA-1.3.4 | Aviso al estudiante antes de confirmar | ✅ | ✅ |

### HE-02 — Curaduría docente

| CA | Criterio | API | E2E |
|---|---|---|---|
| CA-2.1.1 | Filtrado de tarjetas pendientes | ✅ | ✅ |
| CA-2.1.2 | Edición y aprobación | ✅ | ✅ |
| CA-2.1.3 | Rechazo o solicitud de corrección | ⬜ no implementado | ⬜ no implementado |
| CA-2.2.1 | Registro y variante regional | ✅ | ❌ D2 |
| CA-2.2.2 | Asignación masiva por mazo | ✅ | ⬜ el front no llama al endpoint |
| CA-2.2.3 | Visualización del contexto | ✅ | ⬜ el front no tiene la vista |
| CA-2.3.1 | Métricas de participación por mazo | ✅ | ✅ |
| CA-2.3.2 | Informe "Sin aportes" | ✅ | ✅ |
| CA-2.3.3 | Actualización de conteos | ✅ | ✅ |

### HE-03 — Evaluación y exportación

| CA | Criterio | API | E2E |
|---|---|---|---|
| CA-3.1.1 | Solo tarjetas aprobadas | ✅ | ✅ |
| CA-3.1.2 | Preguntas con distractores aleatorios | ✅ | ✅ |
| CA-3.1.3 | Apertura, cierre y tiempo límite | ✅ | ✅ |
| CA-3.2.1 | Control de tiempo | ✅ | ✅ |
| CA-3.2.2 | Calificación inmediata e historial | ✅ | ✅ |
| CA-3.2.3 | Sin reintento, muestra resultado previo | ✅ | ❌ D3 |
| CA-3.3.1 | PDF del mazo semanal | ✅ | ⬜ falta el botón en el front |
| CA-3.3.2 | PDF del quiz con clave de respuestas | 🟡 se genera; la hoja separada se revisa a mano | ⬜ falta el botón en el front |
| CA-3.3.3 | Formato optimizado para impresión | ⬜ revisión visual | ⬜ falta el botón en el front |

### HE-05 — Usuarios, perfiles e inscripción

| CA | Criterio | API | E2E |
|---|---|---|---|
| CA-5.1.1 | Registro con correo institucional | ⬜ requiere Google | ⬜ requiere Google |
| CA-5.1.2 | Rechazo de duplicados y datos inválidos | 🟡 solo token inválido | ⬜ requiere Google |
| CA-5.2.1 | Nivel MCER, código y avatar | ✅ | ✅ |
| CA-5.2.2 | Preferencias de aprendizaje | ✅ | ✅ |
| CA-5.3.1 | Inscripción con código de acceso | ✅ | ✅ |
| CA-5.3.2 | Inscripción directa por la docente | ✅ | ✅ |
| CA-5.4.1 | Autenticación con JWT | ✅ | ✅ |
| CA-5.4.2 | Control de acceso por roles | ✅ | ✅ |
| CA-5.4.3 | Acceso como invitado | ✅ | ✅ |

### Totales

| Estado | API | E2E |
|---|---|---|
| ✅ Cubierto | 32 | 27 |
| 🟡 Parcial | 2 | 0 |
| ❌ Con error | 0 | 2 |
| **Probado (total)** | **34** | **29** |
| ⬜ Sin prueba automática | 3 | 8 |

## 5. Pruebas por historia de usuario

| HU | Nombre | API | E2E |
|---|---|---|---|
| HU-1.1 | Crear mazos | 5 | 3 |
| HU-1.2 | Registrar palabra | 8 | 2 |
| HU-1.3 | Detectar duplicados | 6 | 2 |
| HU-2.1 | Revisar y aprobar | 5 | 2 |
| HU-2.2 | Contexto cultural | 5 | 2 |
| HU-2.3 | Participación | 4 | 3 |
| HU-3.1 | Generar quiz | 8 | 2 |
| HU-3.2 | Responder quiz | 7 | 5 |
| HU-3.3 | Exportar PDF | 4 | 0 |
| HU-5.1 | Registro | 2 | 0 |
| HU-5.2 | Perfil académico | 6 | 2 |
| HU-5.3 | Inscripción | 8 | 3 |
| HU-5.4 | Login y roles | 14 | 7 |
| **Total** | | **82** | **33** |

Son pruebas ejecutadas; no incluye las pendientes.

## 6. Defectos encontrados

| ID | Defecto | HU | Capa | Severidad | Estado | Detectado por |
|---|---|---|---|---|---|---|
| D1 | Los quices abrían 5 h tarde si el backend no corre en UTC (`TIMESTAMP` sin zona) | HU-3.1 | Back | Alta | ✅ Corregido (PR #27, `src/config/db.js`) | API |
| D2 | La variante "Ghanés" se rechaza (el back espera "inglés ghanés"), y como el front aprueba antes de guardar el contexto, la tarjeta queda aprobada sin registro ni variante | HU-2.2 | Front + back | Alta | Abierto | E2E |
| D3 | Desde otro dispositivo no se muestra el resultado previo del quiz: el front no consulta `GET /quizzes/:id/result` | HU-3.2 | Front | Media | Abierto | E2E |
| D4 | Los puntajes del quiz llegan como texto (columnas `NUMERIC`), no como número | HU-3.2 | Back | Baja | Abierto | API |
| D5 | "Sometido por" sale vacío en Revisión de Palabras | HU-2.1 | Front | Baja | Abierto | E2E |
| D6 | La etiqueta "Definición" apunta al campo de traducción (`htmlFor="traduccion"`) | HU-1.2 | Front | Baja | Abierto | E2E |
| D7 | El menú "Quices Quincenales" lleva a una ruta que no existe | HU-3.2 | Front | Baja | Abierto | E2E |

## 7. Pendientes y fuera de alcance

**Pendientes dentro de la suite:**
- **CA-2.1.3 (rechazo):** se agregará cuando se implemente.
- **CA-3.3.1 / 3.3.2 en E2E:** se agregarán cuando se fusione el botón de exportar PDF (rama `feature/HU-009-exportar-pdf`).
- **CA-5.1.1 / 5.1.2 completos:** se prueban de forma manual, porque necesitan una cuenta real de Google.

**Fuera del alcance de esta suite:**
- **HU-4.1 y HU-4.2:** están "Pendiente" en el backlog.
- **Diccionario global:** todavía no está en el backlog oficial.
- **Pruebas de seguridad OWASP Top 10:** son una suite aparte.

## 8. Cómo ejecutar en local

Con los repos clonados dentro de `walking-dictionary-infra` y `docker compose up -d` corriendo en la raíz de infra:

| Suite | Comando | Reporte |
|---|---|---|
| API | `npm run test:funcional` (en `backend/`) | `backend/reportes-funcionales/index.html` |
| E2E | `npm run test:e2e` (en el front) | `npx playwright show-report reportes-e2e/html` |

Detalles en [backend/pruebas-funcionales/README.md](../backend/pruebas-funcionales/README.md) y en `e2e/README.md` del repositorio del front.
