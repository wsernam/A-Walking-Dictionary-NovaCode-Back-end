# Línea base de calidad del código

**Proyecto:** A Walking Dictionary · **Fecha de medición:** 25 de noviembre de 2026
**Código medido:** rama `develop` del Back-end (commit `da2a800`) y del Front-end (commit `b5c5044`)

Esta línea base registra el estado actual del código para compararlo en las próximas mediciones. Es solo un reporte: no se cambió código ni configuración (ESLint se corrió con reglas pasadas por la línea de comandos, sin tocar `eslint.config.js`).

## Resultado

| Métrica | Back-end (actual) | Front-end (actual) | Umbral propuesto |
|---|---|---|---|
| Ciclos de dependencias (madge) | 0 (120 archivos) | 0 (192 archivos) | 0 |
| Funciones con complejidad ciclomática > 10 (ESLint) | 15 (máx. 27) | 20 (máx. 26) | No aumentar; código nuevo ≤ 10 |
| Funciones de más de 50 líneas (ESLint) | 19 (máx. 111) | 44 (máx. 292) | No aumentar; código nuevo ≤ 50 (componentes React: ≤ 150) |
| Rating de mantenibilidad (Sonar) | A (deuda técnica 0,1 %) | A (deuda técnica 0,0 %) | A |
| Duplicación de código (Sonar) | 0,4 % | 1,1 % | ≤ 3 % |
| Code smells (Sonar) | 54 | 0 | Back: ≤ 54 y en descenso; Front: 0 |
| Complejidad cognitiva del archivo más complejo (Sonar) | 67 (`ExportarPDFService.js`) | 56 (`EstudiarTarjetas.jsx`) | ≤ 15 por función en código nuevo (regla S3776) |
| Cobertura de pruebas (Sonar) | 84,1 % | 79,9 % | ≥ 80 % |
| Quality gate de Sonar | Aprobado | **No aprobado** | Aprobado |

### Archivos más grandes y su complejidad cognitiva (Sonar)

| Back-end | Líneas | Complejidad cognitiva | Front-end | Líneas | Complejidad cognitiva |
|---|---|---|---|---|---|
| `services/WordnetService.js` | 452 | 61 | `diccionario-global/DiccionarioGlobal.jsx` | 511 | 37 |
| `services/ExportarPDFService.js` | 345 | 67 | `estudiar-tarjetas/EstudiarTarjetas.jsx` | 432 | 56 |
| `services/QuizService.js` | 307 | 65 | `docente/quices/GenerarQuiz.jsx` | 338 | 45 |
| `controllers/TarjetaController.js` | 271 | 50 | `registrar-tarjeta/RegistrarTarjetaForm.jsx` | 330 | 21 |
| `controllers/MazoController.js` | 253 | 56 | `revision-palabras/RevisionPalabras.jsx` | 316 | 17 |

*Líneas = líneas de código sin comentarios ni líneas en blanco (ncloc). En el Front-end se omiten las hojas de estilo `.css`, que no tienen complejidad.*

### Observaciones

1. **Quality gate del Front-end no aprobado** en `develop`, por dos condiciones: cobertura de 79,9 % (el mínimo es 80 %) y una vulnerabilidad menor en `src/cliente-api/httpClient.js:38` (regla `jssecurity:S8476`, *Client-Side Request Forgery*).
2. **En el panel de Sonar del Front-end hay que elegir la rama `develop`.** La rama principal del proyecto en Sonar es `main`, cuyo último análisis es del 22 de octubre de 2026 y no representa el código actual.
3. **Funciones largas en el Front-end:** casi todas son componentes React, cuyo JSX los alarga. Por eso se propone un umbral aparte para componentes (≤ 150 líneas) en vez de exigir 50.
4. **Mayor deuda en el Back-end:** se concentra en tres servicios (`ExportarPDFService`, `QuizService`, `WordnetService`) y dos controladores (`TarjetaController`, `MazoController`), que son los primeros candidatos a refactorizar.

## Cómo se midió

| Métrica | Comando o fuente |
|---|---|
| Ciclos (Back-end) | `npx madge --circular backend/src` |
| Ciclos (Front-end) | `npx madge --circular --extensions js,jsx src` |
| Complejidad y longitud (Back-end, carpeta `backend`) | `npx eslint src --rule '{"complexity":["warn",10]}' --rule '{"max-lines-per-function":["warn",{"max":50,"skipBlankLines":true,"skipComments":true}]}'` |
| Complejidad y longitud (Front-end) | El mismo comando sobre `src`, con `--ignore-pattern '**/*.test.*' --ignore-pattern 'src/**/mocks/**'` |
| Sonar | Panel de SonarQube Cloud, rama `develop` de los proyectos `wsernam_A-Walking-Dictionary-NovaCode-Back-end` (análisis del 20-nov-2026) y `knnsand_A-Walking-Dictionary-NovaCode-Front-end` (análisis del 21-nov-2026) |

## Anexo: funciones que superan los umbrales (ESLint)

Ordenadas por complejidad. En negrita, el valor que supera el umbral.

### Back-end (`backend/src`): 15 con complejidad > 10, 19 con más de 50 líneas

| Función | Archivo:línea | Complejidad | Líneas |
|---|---|---|---|
| `crear` | `backend/src/controllers/TarjetaController.js:53` | **27** | **111** |
| `crear` | `backend/src/controllers/MazoController.js:57` | **26** | **71** |
| `generar` | `backend/src/services/QuizService.js:233` | **25** | **99** |
| `actualizar` | `backend/src/controllers/MazoController.js:203` | **22** | **59** |
| `enviarRespuestas` | `backend/src/services/QuizService.js:374` | **20** | **78** |
| `crear` | `backend/src/controllers/AporteController.js:14` | **18** | **58** |
| `bloqueTarjeta` | `backend/src/services/ExportarPDFService.js:272` | **18** | ≤ 50 |
| `procesarPointers` | `backend/src/services/WordnetService.js:304` | **16** | **97** |
| `crear` | `backend/src/controllers/PreguntaQuizController.js:24` | **16** | **51** |
| `crear` | `backend/src/controllers/CursoController.js:37` | **16** | ≤ 50 |
| `checkDuplicate` | `backend/src/controllers/TarjetaController.js:210` | **13** | ≤ 50 |
| `bloqueEstudiante` | `backend/src/services/ReporteEstudioPDFService.js:47` | **12** | **85** |
| `actualizar` | `backend/src/controllers/AporteController.js:177` | **12** | ≤ 50 |
| `aprobar` | `backend/src/controllers/AporteController.js:135` | **12** | ≤ 50 |
| `Async arrow function` | `backend/src/services/WordnetService.js:447` | **11** | ≤ 50 |
| `obtenerFamilia` | `backend/src/services/WordnetService.js:584` | ≤ 10 | **90** |
| `generarPdfQuiz` | `backend/src/services/ExportarPDFService.js:417` | ≤ 10 | **85** |
| `construirSugerenciasWordnet` | `backend/src/services/WordnetService.js:441` | ≤ 10 | **83** |
| `consultarResumen` | `backend/src/services/RevisionResultadosQuizService.js:16` | ≤ 10 | **75** |
| `guardarSense` | `backend/src/repositories/WordnetCacheRepository.js:67` | ≤ 10 | **75** |
| `obtenerDatos` | `backend/src/services/ReporteProgresoService.js:61` | ≤ 10 | **69** |
| `consultarRespuestas` | `backend/src/services/RevisionResultadosQuizService.js:112` | ≤ 10 | **68** |
| `obtenerDatos` | `backend/src/services/ReporteResultadosQuizService.js:46` | ≤ 10 | **62** |
| `obtenerDatos` | `backend/src/services/ReporteEstudioService.js:48` | ≤ 10 | **58** |
| `iniciarSesion` | `backend/src/services/EstudioService.js:18` | ≤ 10 | **52** |

### Front-end (`src`, sin pruebas ni mocks): 20 con complejidad > 10, 44 con más de 50 líneas

| Función | Archivo:línea | Complejidad | Líneas |
|---|---|---|---|
| `RevisionResultadosQuices` | `src/vistas/docente/quices/RevisionResultadosQuices.jsx:20` | **26** | **283** |
| `EstudiarTarjetas` | `src/vistas/estudiante/estudiar-tarjetas/EstudiarTarjetas.jsx:197` | **24** | **292** |
| `DiccionarioGlobal` | `src/vistas/diccionario-global/DiccionarioGlobal.jsx:351` | **23** | **223** |
| `validarFormularioQuiz` | `src/vistas/docente/quices/generarQuiz.validation.js:44` | **22** | ≤ 50 |
| `GenerarQuiz` | `src/vistas/docente/quices/GenerarQuiz.jsx:70` | **20** | **288** |
| `GestionUsuarios` | `src/vistas/administrador/usuarios/GestionUsuarios.jsx:29` | **20** | **265** |
| `reductor` | `src/vistas/estudiante/estudiar-tarjetas/EstudiarTarjetas.jsx:65` | **20** | **62** |
| `Sidebar` | `src/componentes/comunes/Sidebar.jsx:142` | **18** | **199** |
| `ParticipacionMazo` | `src/vistas/docente/participacion/ParticipacionMazo.jsx:67` | **18** | **129** |
| `DetalleCurso` | `src/vistas/docente/cursos/DetalleCurso.jsx:17` | **14** | **169** |
| `MazoItem` | `src/vistas/docente/crear-mazo/MazoItem.jsx:28` | **14** | **98** |
| `EnriquecimientoDiccionario` | `src/vistas/diccionario-global/EnriquecimientoDiccionario.jsx:68` | **14** | **97** |
| `Arrow function` | `src/vistas/quices/ListaQuices.jsx:136` | **14** | **75** |
| `ListaQuices` | `src/vistas/quices/ListaQuices.jsx:75` | **13** | **129** |
| `LayoutPrincipal` | `src/componentes/comunes/LayoutPrincipal.jsx:41` | **13** | **53** |
| `RegistrarTarjetaForm` | `src/vistas/estudiante/registrar-tarjeta/RegistrarTarjetaForm.jsx:51` | **12** | **284** |
| `FormularioQuiz` | `src/vistas/estudiante/responder-quiz/FormularioQuiz.jsx:43` | **12** | **145** |
| `SugerenciasPalabras` | `src/vistas/estudiante/estudiar-tarjetas/SugerenciasPalabras.jsx:35` | **12** | **122** |
| `Arrow function` | `src/vistas/estudiante/estudiar-tarjetas/EstudiarTarjetas.jsx:283` | **12** | ≤ 50 |
| `AuthProvider` | `src/contexto/AuthProvider.jsx:62` | **11** | **91** |
| `RevisionPalabras` | `src/vistas/docente/revision-palabras/RevisionPalabras.jsx:37` | ≤ 10 | **281** |
| `CursosEstudiantes` | `src/vistas/docente/cursos/CursosEstudiantes.jsx:15` | ≤ 10 | **220** |
| `App` | `src/App.jsx:127` | ≤ 10 | **207** |
| `CrearMazoForm` | `src/vistas/docente/crear-mazo/CrearMazoForm.jsx:36` | ≤ 10 | **183** |
| `ResponderQuiz` | `src/vistas/estudiante/responder-quiz/ResponderQuiz.jsx:68` | ≤ 10 | **160** |
| `ProgresoEstudiante` | `src/vistas/estudiante/reportes/ProgresoEstudiante.jsx:27` | ≤ 10 | **144** |
| `WordDetails` | `src/vistas/diccionario-global/DiccionarioGlobal.jsx:189` | ≤ 10 | **134** |
| `TarjetaPendienteCard` | `src/vistas/docente/revision-palabras/TarjetaPendienteCard.jsx:40` | ≤ 10 | **126** |
| `ConfigurarPerfilForm` | `src/vistas/estudiante/configurar-perfil/ConfigurarPerfilForm.jsx:20` | ≤ 10 | **119** |
| `TarjetaFlashcard` | `src/vistas/estudiante/estudiar-tarjetas/TarjetaFlashcard.jsx:76` | ≤ 10 | **112** |
| `Arrow function` | `src/vistas/docente/cursos/CursosEstudiantes.jsx:140` | ≤ 10 | **93** |
| `CoautoriaPendienteCard` | `src/vistas/docente/coautoria/CoautoriaPendienteCard.jsx:23` | ≤ 10 | **92** |
| `ResultadoQuiz` | `src/vistas/estudiante/responder-quiz/ResultadoQuiz.jsx:51` | ≤ 10 | **89** |
| `InscribirEstudianteForm` | `src/vistas/docente/inscribir-estudiante/InscribirEstudianteForm.jsx:21` | ≤ 10 | **82** |
| `Login` | `src/vistas/autenticacion/Login.jsx:12` | ≤ 10 | **76** |
| `EtiquetaContextoModal` | `src/vistas/docente/revision-palabras/EtiquetaContextoModal.jsx:39` | ≤ 10 | **69** |
| `UnirseCursoForm` | `src/vistas/estudiante/unirse-curso/UnirseCursoForm.jsx:21` | ≤ 10 | **68** |
| `ConfigurarPerfil` | `src/vistas/estudiante/configurar-perfil/ConfigurarPerfil.jsx:19` | ≤ 10 | **68** |
| `AcercaDe` | `src/vistas/acerca-de/AcercaDe.jsx:23` | ≤ 10 | **68** |
| `Registro` | `src/vistas/autenticacion/registro/Registro.jsx:30` | ≤ 10 | **66** |
| `DiccionarioInvitado` | `src/vistas/invitado/DiccionarioInvitado.jsx:16` | ≤ 10 | **64** |
| `Arrow function` | `src/vistas/estudiante/estudiar-tarjetas/SugerenciasPalabras.jsx:41` | ≤ 10 | **60** |
| `WordCard` | `src/vistas/diccionario-global/DiccionarioGlobal.jsx:110` | ≤ 10 | **57** |
| `MazosEstudio` | `src/vistas/mazos-estudio/MazosEstudio.jsx:39` | ≤ 10 | **53** |
| `PortadaQuiz` | `src/vistas/estudiante/responder-quiz/PortadaQuiz.jsx:21` | ≤ 10 | **53** |
| `Arrow function` | `src/componentes/comunes/Sidebar.jsx:243` | ≤ 10 | **53** |
