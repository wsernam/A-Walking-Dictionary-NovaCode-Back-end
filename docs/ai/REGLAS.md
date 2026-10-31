Reglas del equipo (obligatorias para todos y para el agente):

1. Todo texto visible va por `t('bloque.clave')` con `useTranslation()`, y la clave va en `src/i18n/locales/en.json`, en un bloque propio para evitar conflictos.
2. Lo que se guarda en la base de datos o se envía al backend NO se traduce; solo se traduce lo que se muestra.
3. Las pruebas buscan el texto en inglés.
4. Antes de abrir un PR: `npx vitest run` y `npx eslint` sobre los archivos tocados. Frontend: `npm run lint`, `npm run test:coverage` (Node 22). Backend: en la carpeta `backend/`, `npm run lint` y `npm run test:coverage` (Node 20).
5. Referencias de estilo: `MazoItem.jsx` y `GenerarQuiz.jsx`.
6. Gitflow: rama `feature/...` desde `develop` (minúsculas, guiones, sin tildes; puede incluir el ID de la HU), Pull Request hacia `develop`, con al menos un compañero que apruebe. Al cierre de cada sprint: `release/sprintX` desde `develop` → `main`, y `main` de vuelta a `develop`. `main` está protegida. Commits con prefijo `feat:`, `fix:`, `docs:` o `chore:`.
7. Nunca subir `.env` con valores reales; solo `.env.example`.
8. Cobertura de pruebas del front: más del 70 % (rúbrica del documento de entrega).
