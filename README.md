# A Walking Dictionary 

Aplicación web de vocabulario contextualizado para el curso de Literatura Anglófona (Licenciatura en Educación Bilingüe, Universidad del Cauca). Digitaliza el ejercicio "A Walking Dictionary": los estudiantes registran palabras nuevas por lectura semanal, la docente las revisa y valida, y el sistema genera quices automáticos a partir del vocabulario aprobado.

## Equipo — Grupo 1

- Thalía Bernal
- Karen Sandoval
- William Serna
- Manuela Meneses

**Docente:** Ph.D. MSc. César Jesús Pardo Calvache — Proyecto II, Segundo Semestre 2026.

## Estructura del repositorio

```
walking-dictionary/
├── backend/
└── frontend/
```

## Stack técnico

- **Frontend:** React
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL

## Flujo de trabajo (Git)

Se sigue un flujo tipo **Gitflow**, adaptado al ritmo de sprints del curso (3 sprints en 16 semanas).

### Estrategia de ramas

| Rama | Uso |
| --- | --- |
| `main` | Rama protegida y de producción. Solo recibe merges desde `release/*` o `hotfix/*`. Siempre debe estar en estado desplegable. |
| `develop` | Rama de integración. Aquí se juntan todas las funcionalidades ya terminadas y probadas antes de pasar a `release`. |
| `feature/nombre-corto` | Nueva funcionalidad o historia de usuario, creada desde `develop`. Ej: `feature/gestion-electivas`, `feature/conexion-back-front`. |
| `feature/area/nombre-corto` | Variante con subcarpeta cuando se quiere agrupar por módulo/área. Ej: `feature/backend/publicadores-consumidores`, `feature/frontend/panel-docente`. |
| `release/nombre-o-version` | Prepara una entrega (fin de sprint). Se crea desde `develop`, se estabiliza (ajustes finos, sin funcionalidades nuevas) y luego se mergea a `main` y de vuelta a `develop`. |
| `hotfix/nombre-corto` | Corrección urgente directo sobre `main` cuando ya hubo release y aparece un bug crítico. Se mergea a `main` y a `develop`. |
| `backup/nombre-corto` | Respaldo puntual de una rama antes de un cambio riesgoso (rebase, refactor grande). No se mergea a `develop`; se elimina cuando ya no se necesita. |

### Convenciones de nombre

- Minúsculas, palabras separadas por guion (`-`), sin tildes ni ñ.
- El nombre describe la funcionalidad o módulo, no la persona ni la fecha. Ej: `feature/gestion-electivas`, no `feature/manuela-tarea1`.
- Cuando la rama corresponde a una historia de usuario del backlog, se puede incluir el ID: `feature/HU-002-registro-palabra`.

### Flujo de trabajo

1. Actualizar `develop` local (`git pull origin develop`) antes de crear una rama nueva.
2. Crear la rama de trabajo desde `develop`: `git checkout -b feature/nombre-corto`.
3. Trabajar con commits pequeños y descriptivos (`feat:`, `fix:`, `docs:`, `chore:`).
4. Subir la rama: `git push -u origin feature/nombre-corto`.
5. Abrir un Pull Request hacia `develop`, enlazando la historia/issue correspondiente del board.
6. Al menos un compañero revisa y aprueba el PR antes de hacer merge.
7. Al cierre de cada sprint: crear `release/sprintX` desde `develop`, estabilizar, hacer PR de `release/sprintX` → `main` y luego mergear `main` de vuelta a `develop`.
8. Si aparece un bug crítico en producción: crear `hotfix/nombre-corto` desde `main`, corregir, y mergear tanto a `main` como a `develop`.
9. Eliminar cada rama (`feature/*`, `release/*`, `hotfix/*`) una vez mergeada, para mantener la lista limpia.
