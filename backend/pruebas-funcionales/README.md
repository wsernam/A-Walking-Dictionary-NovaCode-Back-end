# Pruebas funcionales de la API

Una prueba por criterio de aceptación (CA) del backlog, contra el backend **corriendo** y una base PostgreSQL **real**.

| | Pruebas unitarias (`tests/`) | Pruebas funcionales (`pruebas-funcionales/`) |
|---|---|---|
| Qué prueban | Servicios, controladores y middleware aislados | Cada CA de punta a punta, por HTTP |
| Base de datos | Simulada (`vi.mock`) | PostgreSQL real |
| Comando | `npm test` / `npm run test:coverage` | `npm run test:funcional` |
| CI | `backend-tests.yml` (+ SonarQube) | `funcionales.yml` |

## Ejecutar en local

Con este repo clonado dentro de `walking-dictionary-infra`:

```bash
# desde la raíz de walking-dictionary-infra
docker compose up -d db backend

# desde backend/
npm run test:funcional
```

- **Las pruebas reinician la base local** al estado de `init.sql` + `seed.sql` antes de empezar, para partir siempre del mismo estado. Si el contenedor `walking_dictionary_db` está corriendo, el reinicio se hace dentro de él. Para no reiniciarla: `SIN_REINICIO_BD=true npm run test:funcional`.
- **Variables:** se leen de las del proceso, luego de `backend/.env` y luego del `.env` de infra. `JWT_SECRET` tiene que ser el mismo que usa el backend probado, y `DISABLE_AUTH` debe ser `false`.
- **Otro backend:** `API_URL=http://localhost:5001 npm run test:funcional`.
- **Nunca** apuntar `DB_HOST` a Supabase: la preparación lo bloquea.

## Login

El login real es con Google y no se puede automatizar. Las pruebas firman el JWT con `JWT_SECRET` y el mismo payload que `AutenticacionService.emitirSesion` (`{ id_usuario, email, rol }`), para los usuarios del seed:

| Usuario (seed) | id | Rol | Uso en las pruebas |
|---|---|---|---|
| Ana Docente | 1 | docente | Dueña del curso 1 y de sus mazos |
| William Serna | 5 | docente | Docente que **no** es dueña (403 por propiedad) |
| Juan, María, Carlos | 2, 3, 4 | estudiante | Inscritos en el curso 1 |
| ksandoval, manmeneses | 6, 7 | estudiante | HU-5.3 los inscribe (por código y por correo) |
| thaliabernal | 8 | estudiante | Nunca se inscribe: caso "no inscrito" (403) |

## Reporte

Cada ejecución genera `reportes-funcionales/index.html` (abrir con `npx vite preview --outDir reportes-funcionales`) y `reportes-funcionales/junit.xml`. En GitHub Actions se descarga como artefacto `reporte-pruebas-funcionales`.

## Qué cubre

| Archivo | HU |
|---|---|
| `he01-mazos-vocabulario.test.js` | HU-1.1, 1.2, 1.3 |
| `he02-curaduria-docente.test.js` | HU-2.1, 2.2, 2.3 |
| `he03-evaluacion-exportacion.test.js` | HU-3.1, 3.2, 3.3 |
| `he05-usuarios-perfiles.test.js` | HU-5.1, 5.2, 5.3, 5.4 |

Las pruebas `todo` aparecen en el reporte como pendientes:

- **CA-2.1.3** (rechazo): no está implementado.
- **CA-3.3.3** (formato del PDF): se revisa abriendo el archivo.
- **CA-5.1.1 / 5.1.2** (registro exitoso): necesitan un token real de Google.

No se incluyen HU-4.1 ni HU-4.2 (Pendiente en el backlog) ni el diccionario global (todavía no está en el backlog).
