<!-- Generado por backend/pruebas-funcionales/soporte/graficas-entrada.mjs; no editar a mano. -->
# Resultados por caso — entrada sobredimensionada

Ejecución: 2026-11-28T02:12:25.808Z · Node v25.0.0 · 63 casos · 5xx: 0 · caso más lento: body 10240 kB (35.84 ms)

| Grupo | Caso | Endpoint | Status | code | ms | /health después |
|---|---|---|---|---|---|---|
| texto-body | palabra 151 | `POST /decks/:id/cards (palabra)` | 400 | FIELD_TOO_LONG | 7.3 | sí |
| texto-body | palabra 1000 | `POST /decks/:id/cards (palabra)` | 400 | FIELD_TOO_LONG | 5.14 | sí |
| texto-body | palabra 10000 | `POST /decks/:id/cards (palabra)` | 400 | FIELD_TOO_LONG | 5.69 | sí |
| texto-body | palabra 90000 | `POST /decks/:id/cards (palabra)` | 400 | FIELD_TOO_LONG | 5.33 | sí |
| texto-body | ejemplo 151 | `POST /decks/:id/cards (ejemplo)` | 400 | FIELD_TOO_LONG | 4.31 | sí |
| texto-body | ejemplo 1000 | `POST /decks/:id/cards (ejemplo)` | 400 | FIELD_TOO_LONG | 4.89 | sí |
| texto-body | ejemplo 10000 | `POST /decks/:id/cards (ejemplo)` | 400 | FIELD_TOO_LONG | 4.57 | sí |
| texto-body | ejemplo 90000 | `POST /decks/:id/cards (ejemplo)` | 400 | FIELD_TOO_LONG | 5.41 | sí |
| texto-body | autor 151 | `POST /decks (autor)` | 400 | FIELD_TOO_LONG | 2.43 | sí |
| texto-body | autor 1000 | `POST /decks (autor)` | 400 | FIELD_TOO_LONG | 1.47 | sí |
| texto-body | autor 10000 | `POST /decks (autor)` | 400 | FIELD_TOO_LONG | 1.46 | sí |
| texto-body | autor 90000 | `POST /decks (autor)` | 400 | FIELD_TOO_LONG | 1.78 | sí |
| texto-body | check-duplicate 151 | `POST /cards/check-duplicate (palabra)` | 200 | — | 3.4 | sí |
| texto-body | check-duplicate 1000 | `POST /cards/check-duplicate (palabra)` | 200 | — | 3.16 | sí |
| texto-body | check-duplicate 10000 | `POST /cards/check-duplicate (palabra)` | 200 | — | 3.25 | sí |
| texto-body | check-duplicate 90000 | `POST /cards/check-duplicate (palabra)` | 200 | — | 6.97 | sí |
| texto-url | family 151 | `GET /enrichment/family/:word` | 400 | FIELD_TOO_LONG | 1.03 | sí |
| texto-url | family 1000 | `GET /enrichment/family/:word` | 400 | FIELD_TOO_LONG | 1.22 | sí |
| texto-url | family 8000 | `GET /enrichment/family/:word` | 400 | FIELD_TOO_LONG | 0.98 | sí |
| texto-url | family 20000 | `GET /enrichment/family/:word` | 431 | — | 2.48 | sí |
| texto-url | dictionary q 151 | `GET /dictionary?q=` | 200 | — | 4.28 | sí |
| texto-url | dictionary q 1000 | `GET /dictionary?q=` | 200 | — | 3.24 | sí |
| texto-url | dictionary q 8000 | `GET /dictionary?q=` | 200 | — | 7.2 | sí |
| texto-url | dictionary q 20000 | `GET /dictionary?q=` | 431 | — | 1.33 | sí |
| body | body 10 kB | `POST /cards/check-duplicate` | 400 | INVALID_ID | 2.75 | sí |
| body | body 99 kB | `POST /cards/check-duplicate` | 400 | INVALID_ID | 1.94 | sí |
| body | body 101 kB | `POST /cards/check-duplicate` | 413 | BAD_REQUEST | 2.43 | sí |
| body | body 1024 kB | `POST /cards/check-duplicate` | 413 | BAD_REQUEST | 5.29 | sí |
| body | body 5120 kB | `POST /cards/check-duplicate` | 413 | BAD_REQUEST | 17.78 | sí |
| body | body 10240 kB | `POST /cards/check-duplicate` | 413 | BAD_REQUEST | 35.84 | sí |
| body | auth 101 kB | `POST /auth/google (sin sesión)` | 413 | BAD_REQUEST | 5.01 | sí |
| body | auth 1024 kB | `POST /auth/google (sin sesión)` | 413 | BAD_REQUEST | 4.37 | sí |
| body | auth 5120 kB | `POST /auth/google (sin sesión)` | 413 | BAD_REQUEST | 16.41 | sí |
| body | auth 10240 kB | `POST /auth/google (sin sesión)` | 413 | BAD_REQUEST | 33.39 | sí |
| anidado | arreglo 20 | `POST /cards/check-duplicate (arreglo)` | 400 | INVALID_ID | 1.86 | sí |
| anidado | arreglo 21 | `POST /cards/check-duplicate (arreglo)` | 400 | INVALID_ID | 1.15 | sí |
| anidado | arreglo 100 | `POST /cards/check-duplicate (arreglo)` | 400 | BAD_REQUEST | 1.18 | sí |
| anidado | arreglo 1000 | `POST /cards/check-duplicate (arreglo)` | 400 | BAD_REQUEST | 1.4 | sí |
| anidado | arreglo 10000 | `POST /cards/check-duplicate (arreglo)` | 400 | BAD_REQUEST | 2.88 | sí |
| anidado | arreglo 50000 | `POST /cards/check-duplicate (arreglo)` | 400 | BAD_REQUEST | 8.53 | sí |
| anidado | objeto 21 | `POST /cards/check-duplicate (objeto)` | 400 | BAD_REQUEST | 1.13 | sí |
| anidado | objeto 1000 | `POST /cards/check-duplicate (objeto)` | 400 | BAD_REQUEST | 1.07 | sí |
| anidado | objeto 16000 | `POST /cards/check-duplicate (objeto)` | 400 | BAD_REQUEST | 4.18 | sí |
| anidado | query 1000 | `GET /dictionary?q[a][a]...` | 400 | INVALID_QUERY | 1.15 | sí |
| redos | fecha 1000 | `POST /decks (fecha_apertura)` | 400 | INVALID_FIELD_TYPE | 1.4 | sí |
| redos | fecha 10000 | `POST /decks (fecha_apertura)` | 400 | INVALID_FIELD_TYPE | 1.12 | sí |
| redos | fecha 90000 | `POST /decks (fecha_apertura)` | 400 | INVALID_FIELD_TYPE | 2.87 | sí |
| redos | fecha-digitos 1000 | `POST /decks (fecha_cierre)` | 400 | INVALID_FIELD_TYPE | 1.92 | sí |
| redos | fecha-digitos 10000 | `POST /decks (fecha_cierre)` | 400 | INVALID_FIELD_TYPE | 1.53 | sí |
| redos | fecha-digitos 90000 | `POST /decks (fecha_cierre)` | 400 | INVALID_FIELD_TYPE | 1.99 | sí |
| redos | id 1000 | `GET /decks/:id` | 400 | INVALID_ID | 1.11 | sí |
| redos | id 8000 | `GET /decks/:id` | 400 | INVALID_ID | 0.85 | sí |
| redos | card_id 1000 | `GET /dictionary/:card_id` | 400 | INVALID_ID | 1.11 | sí |
| redos | card_id 8000 | `GET /dictionary/:card_id` | 400 | INVALID_ID | 0.81 | sí |
| redos | q-control 1000 | `GET /dictionary?q= (control)` | 400 | INVALID_QUERY | 1.07 | sí |
| redos | q-control 8000 | `GET /dictionary?q= (control)` | 400 | INVALID_QUERY | 0.8 | sí |
| redos | q-like 150 | `GET /dictionary?q= (comodines LIKE)` | 200 | — | 3.27 | sí |
| redos | q-like 1000 | `GET /dictionary?q= (comodines LIKE)` | 200 | — | 2.83 | sí |
| redos | q-like 4000 | `GET /dictionary?q= (comodines LIKE)` | 200 | — | 5.5 | sí |
| redos | q-like 8000 | `GET /dictionary?q= (comodines LIKE)` | 200 | — | 24.46 | sí |
| redos | admin-search 100 | `GET /admin/users?search=` | 200 | — | 7.03 | sí |
| redos | admin-search 1000 | `GET /admin/users?search=` | 400 | ADMIN_INVALID_QUERY | 1.66 | sí |
| redos | admin-search 5000 | `GET /admin/users?search=` | 400 | ADMIN_INVALID_QUERY | 1.27 | sí |
