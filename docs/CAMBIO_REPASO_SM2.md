# Cambio: el repaso SM-2 ya no se queda sin tarjetas (HU-4.1)

**Fecha:** 2026-09-30
**Rama:** `develop` (sin commit al momento de escribir esto)
**Endpoint afectado:** `POST /api/v1/study/review-session` (mismo contrato, mismo body, misma respuesta)

## Autoría: quién hizo qué

| Parte | Autor |
|---|---|
| Implementación original de HU-4.1 (SM-2, sesión de repaso, flashcards, pronunciación en el front) | Manuela Erazo (front, commit `51a3893`) y equipo (back) |
| Reporte del problema y criterios de la solución (mazos por adelantado, repaso acumulativo, SM-2 en cada valoración) | Manuela Erazo |
| Cambios en `EstudioRepository.js` y `EstudioService.js`, datos de prueba en `seed.sql` y este documento | wsernam |

## El problema

El equipo reportó: *"se acaban las tarjetas y no aparecen más sino hasta que se agrega una nueva
palabra"*. Había dos causas:

1. **SM-2 filtraba la sesión.** `iniciarSesion` solo devolvía las tarjetas nunca estudiadas y las
   que ya les tocaba repaso. Toda tarjeta valorada queda programada para dentro de 1 día o más
   (aunque se marque "Repetir"), así que, al terminar una sesión, el estudiante no tenía nada más
   que estudiar hasta 24 horas después.
2. **Los mazos cerrados desaparecían del repaso.** La consulta filtraba `m.estado = 'abierto'`.
   Al cerrar un mazo, sus palabras ya no salían, justo cuando el estudiante más las necesita:
   en el plan de clase, el quiz de una lectura llega después de que se cierra su mazo.

## Decisiones del equipo (chat, 2026-09-29)

La primera propuesta fue quitar del todo el filtro de mazo y no subir el intervalo de SM-2 cuando
el estudiante repasa antes de tiempo. Manuela corrigió dos puntos y se adoptaron así:

| Punto | Decisión |
|---|---|
| Mazos creados por adelantado | **No** deben salir en el repaso. La docente puede crear de una vez los mazos de todo el curso con distintas fechas de apertura. |
| Mazos cerrados | **Sí** salen. El repaso de flashcards es acumulativo: reúne todas las palabras del curso, no solo las del último mazo. |
| Repasar varias veces el mismo día | **Sí** cuenta para SM-2. Si el estudiante estudia una y otra vez antes del quiz, eso refleja dominio de la palabra, así que cada valoración sigue recalculando SM-2 (CA-4.1.2). |

## Qué se cambió

### 1. `backend/src/repositories/EstudioRepository.js`

```sql
-- antes
AND m.estado = 'abierto'
-- ahora
AND m.fecha_apertura <= CURRENT_DATE
```

¿Por qué la fecha y no el estado? `MazoController.crear` **siempre** crea los mazos con estado
`'abierto'`, incluso los que abren en noviembre, así que el estado no distingue un mazo creado por
adelantado. La `fecha_apertura` sí. Cerrar un mazo sigue impidiendo agregar palabras (CA-1.2.3),
pero ya no lo saca del repaso.

### 2. `backend/src/services/EstudioService.js` → `iniciarSesion`

Antes **descartaba** las tarjetas que todavía no tocaban. Ahora devuelve **todas** las tarjetas
disponibles y SM-2 solo define el **orden**:

1. **Vencidas**: ya les tocaba repaso, de la más atrasada a la más reciente.
2. **Nuevas**: nunca estudiadas, en orden de creación.
3. **El resto**: de la que más le cuesta al estudiante a la que menos (menor `factor_facilidad`
   primero) y, a igual factor, la más próxima a vencer.

### 3. Lo que NO cambió

- `EstudioService.registrarValoracion` y `SM2Service`: cada valoración recalcula SM-2 como antes.
- El contrato del endpoint (`{ inscripcion_id, total_tarjetas, tarjetas }`, cada tarjeta con su
  `progreso` o `null`). **El front no necesita cambios.**
- La base de datos.

## Qué tarjetas salen ahora en el modo estudio

| Caso | ¿Sale? |
|---|---|
| Palabra aprobada en un mazo abierto | ✅ |
| Palabra aprobada en un mazo cerrado | ✅ |
| Palabra pendiente de revisión (cualquier mazo) | ❌ hasta que la docente la apruebe |
| Palabra de un mazo cuya `fecha_apertura` aún no llega | ❌ |
| Palabra de un mazo de otro curso | ❌ |
| Palabra ya valorada hoy | ✅ al final de la sesión |

## Comportamientos que conviene conocer

- **Salir de la página a mitad de una sesión no pierde el progreso.** Cada valoración se guarda en
  `progreso_estudio` apenas se confirma. Lo que se pierde es solo el estado en pantalla (posición,
  contador, resumen final). Al volver, las tarjetas que no alcanzó a ver salen primero, porque las
  ya valoradas quedan con fecha futura y pasan al final. Se decidió **no** guardar la sesión en
  `sessionStorage` por ahora (ningún CA lo pide y trae problemas de sesiones desactualizadas).
- **La fonética no llega con la API real.** El front muestra `fonetica` si viene en la tarjeta,
  pero ese campo solo existe en los datos simulados (`estudioMock.js`). La tabla `tarjeta` no tiene
  esa columna. El botón de audio (`speechSynthesis`) sí funciona, porque solo usa la palabra.

## Datos de prueba (`seed.sql`)

Se agregaron 9 mazos, uno por cada libro del plan de clase real (English Literature 2026-2,
prof. Angela Castro), con fechas de apertura según la semana de la clase:

- 5 mazos cerrados (agosto y septiembre), con 6 palabras aprobadas cada uno.
- *Fear of Stones and Other Stories*, abierto: 4 palabras aprobadas, 2 pendientes y 1 coautoría
  pendiente sobre una palabra ya aprobada (*island*).
- 3 mazos de octubre y noviembre, sin palabras y con fecha de apertura futura (no salen en el
  repaso).

Las palabras son vocabulario temático de cada lectura, no una extracción del texto de los libros,
y los ejemplos son frases propias. Si se consiguen las listas reales de vocabulario, se pueden
reemplazar.

Con hoy = 2026-09-30, cada estudiante de prueba tiene **34 tarjetas** en el repaso.

## Cómo se probó

- **Orden de la sesión:** `iniciarSesion` con repositorios simulados (6 tarjetas: 2 vencidas,
  2 nuevas, 2 sin vencer con distinto factor). Resultado: vencida más atrasada → vencida reciente →
  nuevas → la más difícil → la más fácil, sin descartar ninguna.
- **Seed:** `init.sql` + `seed.sql` en un Postgres temporal creado desde cero. Corre sin errores y
  la consulta del repaso devuelve 34 tarjetas para la inscripción 1.
- **Pendiente:** prueba de punta a punta en la app (iniciar sesión como estudiante, terminar una
  sesión, "Volver a cargar" y comprobar que vuelven a salir todas las tarjetas).

## Pendientes y supuestos

- **Zona horaria:** `CURRENT_DATE` usa la de PostgreSQL (UTC en Docker), así que un mazo empieza a
  verse desde las 7:00 p. m. (hora Colombia) del día anterior a su `fecha_apertura`.
- **Texto del estado vacío en el front** (`EstudiarTarjetas.jsx`): todavía habla de "mazos
  abiertos" y del "próximo repaso". Ahora solo aparece si el curso no tiene ninguna palabra
  aprobada. Es de la HU-010 del front; queda a criterio de su responsable.
- **Inscripción fija en el modo estudio** (front, fuera de este cambio): `PaginaEstudio.jsx` usa
  `VITE_INSCRIPCION_ID_SIMULADA` en vez de la inscripción del estudiante que inició sesión, así que
  todos los estudiantes estudian (y guardan progreso) como la misma inscripción.
- **Posibles mejoras futuras**, si el equipo las pide: elegir un mazo específico antes de estudiar
  (útil antes de un quiz) y avisar al salir de una sesión en curso.
