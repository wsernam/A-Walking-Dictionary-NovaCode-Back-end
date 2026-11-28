# Entrada sobredimensionada

Comprobación de que ninguna entrada enorme o rara tumba la API: la respuesta tiene que ser un error controlado (400 o 413; 431 si Node corta la URL), nunca un 5xx, y el servidor tiene que seguir respondiendo `/health` después de cada caso.

- **Prueba:** [`backend/pruebas-funcionales/entrada-sobredimensionada.test.js`](../../../backend/pruebas-funcionales/entrada-sobredimensionada.test.js). Corre con `npm run test:funcional`. Levanta su propia instancia del backend con los límites de peticiones altos (no gasta el contador de la suite) y no arranca si `DB_HOST` apunta a Supabase.
- **Gráficas:** `node pruebas-funcionales/soporte/graficas-entrada.mjs` (desde `backend/`) lee `reportes-funcionales/entrada-sobredimensionada.json` y regenera los SVG y [`resultados.md`](resultados.md) (tabla de los 63 casos).

## Resultado

**63 casos, 0 respuestas 5xx, `/health` respondió 200 después de todos y el proceso nunca se cayó.** Ninguna línea `[ERROR]` ni `[SEGURIDAD] 5xx` en el log. El caso más lento fue el body de 10 MB (~35 ms, casi todo el tiempo de subida del cliente).

| Grupo | Casos | Respuesta |
|---|---|---|
| Textos de más de 150 caracteres (`palabra`, `ejemplo`, `autor`, `family/:word`) | 151, 1 000, 10 000 y 90 000 caracteres | 400 `FIELD_TOO_LONG` |
| URL de más de ~16 kB (`family/:word`, `?q=`) | 20 000 caracteres | 431 de Node, antes de Express |
| Body JSON ≤ 100 kB | 10 kB y 99 kB | Llega al controlador: 400 |
| Body JSON > 100 kB (con y sin sesión) | 101 kB, 1 MB, 5 MB y 10 MB | 413 `{ error, code: 'BAD_REQUEST' }` |
| JSON anidado (arreglos y objetos, body y query) | 20 a 50 000 niveles | 400 |
| ReDoS: fechas (`esFechaValida`), ids (`leerIdRuta`), `card_id`, caracteres de control | hasta 90 000 caracteres | 400 en menos de 4 ms |
| ReDoS: comodines de LIKE en `?q=` y búsqueda admin | hasta 8 000 caracteres | 200 o 400 en menos de 25 ms |

Las regex de `src/utils/validacion.js` no tienen cuantificadores anidados: la latencia no crece con la longitud de la entrada.

## Gráficas

![Latencia según la longitud del texto](latencia-texto.svg)

![Latencia según el tamaño del body JSON](latencia-body.svg)

![Latencia según la anidación del JSON](latencia-anidado.svg)

![Latencia de cada caso, por endpoint](latencia-casos.svg)

Las latencias son de una sola ejecución local (backend y PostgreSQL en la misma máquina). Sirven para ver la tendencia, no como referencia absoluta.

## Observaciones (ninguna es un 5xx; sin corregir)

1. **`POST /cards/check-duplicate` no limita `palabra`.** Con más de 150 caracteres responde 200 `{ duplicado: false, resultado: 'creada' }`, aunque `POST /decks/:id/cards` rechazaría esa misma palabra con 400 `FIELD_TOO_LONG`.
2. **`GET /dictionary?q=` no tiene longitud máxima** y pasa `%` y `_` a `ILIKE` sin escaparlos: `q=_` coincide con cualquier palabra. Es rápido (no hay ReDoS), pero la búsqueda no es literal. La búsqueda de administración sí escapa los comodines (`UsuarioRepository.js`).
3. **La respuesta 431 (URL de más de ~16 kB) no es `{ error, code }`.** La genera el parser HTTP de Node antes de Express, sin cuerpo.
4. **JSON con más de 20 niveles:** responde 400 con el mensaje de «byte nulo» (`validacionMiddleware.js` trata la profundidad > 20 como inválida). El equipo decidió dejarlo así (2026-11-27).
5. **El 413 usa `code: 'BAD_REQUEST'`.** El equipo decidió no agregar un código propio (2026-11-27).
