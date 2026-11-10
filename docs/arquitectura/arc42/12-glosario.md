# 12. Glosario

| Término | Definición |
| --- | --- |
| Aporte | Participación de un estudiante sobre una tarjeta. Su `tipo_aporte` es `creada`, `coautoria` o `acepcion_nueva` |
| Acepción | Significado adicional de una palabra ya registrada, con otra definición |
| Coautoría | Aporte con la misma definición que una tarjeta existente; suma al estudiante como coautor |
| Curaduría | Revisión de la docente: edita, aprueba y asigna contexto a las tarjetas |
| Mazo | Conjunto de tarjetas de una lectura o semana de un curso; estado `abierto` o `cerrado` |
| Tarjeta | Palabra con su traducción, definición y ejemplo opcional (máximo 150 caracteres) |
| `pendiente_revision` | Estado de una tarjeta recién registrada, a la espera de la docente |
| `revisado_docente` | Estado de una tarjeta aprobada; solo estas entran en quices y diccionario |
| Etiqueta de contexto | Registro y variante regional que la docente asigna a una tarjeta |
| Registro | Nivel de formalidad de una palabra: Formal, Informal o Slang |
| Variante regional (o dialectal) | Variedad del inglés a la que pertenece una palabra (por ejemplo inglés ghanés o jamaicano) |
| SM-2 | Algoritmo de repetición espaciada que calcula cuándo repasar cada tarjeta |
| Factor de facilidad | Valor de SM-2 que crece o decrece según las valoraciones; su mínimo es 1.3 |
| Valoración | Respuesta del estudiante en un repaso: Repetir, Difícil, Buena o Fácil |
| MCER | Marco Común Europeo de Referencia para las lenguas; el nivel de inglés va de A1 a C2 |
| Quiz acumulativo | Quiz con tarjetas aprobadas de varios mazos; se califica por estudiante en escala de 0 a 5 |
| Estado efectivo | Estado del quiz (programado, abierto, cerrado) calculado por fecha |
| Inscripción | Vínculo de un estudiante con un curso; debe estar `activa` para aportar |
| Código de acceso | Código que la docente comparte para que un estudiante se una a un curso |
| Invitado | Usuario sin sesión con acceso de solo lectura a la demostración |
| `idToken` | Token firmado por Google que el front envía al backend para iniciar sesión |
| JWT | Token propio de la aplicación (HS256, 8 horas) con `id_usuario`, `email` y `rol` |
| WordNet | Base léxica del inglés; aporta sinónimos, hiperónimos (términos más generales) e hipónimos (más específicos) |
| HE, HU, CA | Épica, historia de usuario y criterio de aceptación del backlog |
| DER | Diagrama entidad-relación; su versión oficial es `init.sql` |
| DP-nn, D-nn | Decisión del proyecto (`DECISIONES.md`) y discrepancia pendiente (`CLAUDE.md`) |
| HITL | Humano en el circuito: el equipo valida las decisiones críticas de la IA |
| SUPERPROMPT | Documento de contexto del proyecto que se reconstruye automáticamente |
| OWASP Top 10 | Lista de los riesgos de seguridad web más críticos; base de la auditoría del proyecto |
| RLS | Seguridad a nivel de fila de PostgreSQL, habilitada en Supabase |
| Gitflow | Flujo de ramas del equipo (`feature`, `develop`, `release`, `main`) |