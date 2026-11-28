# Pruebas funcionales de la API

Una prueba por criterio de aceptación (CA) del backlog, contra el backend **corriendo** y una base PostgreSQL **real**.

| | Pruebas unitarias (`tests/`) | Pruebas funcionales (`pruebas-funcionales/`) |
|---|---|---|
| Qué prueban | Servicios, controladores y middleware aislados | Cada CA de punta a punta, por HTTP |
| Base de datos | Simulada (`vi.mock`) | PostgreSQL real |
| Comando | `npm test` / `npm run test:coverage` | `npm run test:funcional` |
| CI | `backend-tests.yml` (+ SonarQube) | `funcionales.yml` |

## Ejecutar en local

Con el repo del backend clonado:

```bash
# desde la raíz de este repo (crea la base con init.sql + seed.sql)
docker compose up -d postgres

# desde backend/ (con backend/.env creado, ver .env.example)
npm run dev                 # en una terminal
npm run test:funcional      # en otra
```

- **Las pruebas reinician la base local** al estado de `init.sql` + `seed.sql` antes de empezar, para partir siempre del mismo estado. Si el contenedor `walking_dictionary_db` está corriendo, el reinicio se hace dentro de él. Para no reiniciarla: `SIN_REINICIO_BD=true npm run test:funcional`.
- **Variables:** se leen de las del proceso, luego de `backend/.env` y luego del .env de la carpeta que contiene el clon del repo. `JWT_SECRET` tiene que ser el mismo que usa el backend probado, y `DISABLE_AUTH` debe ser `false`.
- **Límite de solicitudes (429):** para repetir la suite sin recibir 429, define en `backend/.env` `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_REPORTES_MAX` y `RATE_LIMIT_ADMIN_MAX` (p. ej. 1000) y reinicia el backend; `funcionales.yml` ya los define.
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
| `he05-administracion-usuarios.test.js` | HU-023 (CA-23.1, CA-23.2) |
| `hu023-control-acceso.test.js` | HU-023 (CA-23.3) |
| `rbac-matriz.test.js` | Matriz RBAC: código HTTP de 61 endpoints × 4 roles (`datos/matriz-rbac.json`) |
| `rbac-idor.test.js` | IDOR: estudiante A contra B, no inscrita y docente ajena (37 casos) |
| `rbac-cobertura.test.js` | Toda ruta de `app.js` está en la matriz |
| `seguridad-sesion.test.js` | Seguridad de sesión: token manipulado, `alg:none`, vencido, reutilizado tras logout y cuenta desactivada (21 casos, 2 `[RIESGO CONOCIDO]`) |
| `entrada-sobredimensionada.test.js` | Entrada enorme o rara (textos > 150, body ≥ 1 MB, JSON anidado, ReDoS): siempre 400/413/431, nunca 5xx, y `/health` vivo tras cada caso. Levanta su propia instancia; no arranca si `DB_HOST` apunta a Supabase. Gráficas: `node pruebas-funcionales/soporte/graficas-entrada.mjs` → [`docs/seguridad/entrada-sobredimensionada/`](../../docs/seguridad/entrada-sobredimensionada/README.md) |

Las pruebas `todo` aparecen en el reporte como pendientes:

- **CA-2.1.3** (rechazo): no está implementado.
- **CA-3.3.3** (formato del PDF): se revisa abriendo el archivo.
- **CA-5.1.1 / 5.1.2** (registro exitoso): necesitan un token real de Google.

Los casos marcados `[RIESGO CONOCIDO]` (y los `HALLAZGO-n` de IDOR y de la matriz RBAC) corren con `it.fails`: declaran el resultado seguro y aparecen como "expected fail", así la integración continua sigue en verde y el hueco queda visible. Cuando el backend se corrija, el caso empieza a pasar, `it.fails` lo reporta como fallo y se cambia por `it`:

- **SES-13b**: el backend no revoca tokens al cerrar sesión (no hay `POST /auth/logout` ni lista de revocación).
- **SES-14b**: el backend no consulta `usuario.activo`; un token vigente de una cuenta desactivada sigue funcionando hasta 8 h.

No se incluyen HU-4.1 ni HU-4.2 (Pendiente en el backlog) ni el diccionario global (todavía no está en el backlog).
