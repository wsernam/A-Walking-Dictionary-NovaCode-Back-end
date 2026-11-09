# Documentación — A Walking Dictionary (Back-end)

Índice de la documentación de este repositorio. La documentación del front-end está en su propio repositorio:
[`docs/README.md` del Front-end](https://github.com/knnsand/A-Walking-Dictionary-NovaCode-Front-end/blob/develop/docs/README.md).

Dónde vive cada cosa:

| Tema | Repositorio |
| --- | --- |
| Especificación de la API (OpenAPI), arquitectura (Arc42), contratos Back → Front, flujos, códigos de error | **Back-end** (aquí) |
| Manuales de usuario, contratos Front → Back, documentación de componentes, pruebas E2E | **Front-end** |

## Estado de los marcos de documentación

| Marco / estándar | Ubicación | Estado |
| --- | --- | --- |
| OpenAPI | [`docs/api/openapi.yaml`](api/openapi.yaml) (cómo verlo y validarlo: [`api/README.md`](api/README.md)) | Completo (con supuestos pendientes marcados con `x-pendiente`) |
| Arc42 | `docs/arquitectura/arc42/` | Completo (12 secciones) |
| Documentación de usuario (IEEE 1063 / ISO/IEC/IEEE 26514) | Front-end: `docs/usuario/` | Pendiente |
| Documentación del código (JSDoc) | Comentarios en `backend/src/`; página generada con `npm run docs:code` ([`codigo/README.md`](codigo/README.md)) | Completo |

## API y contratos con el front

| Documento | Contenido |
| --- | --- |
| [`codigos-error.md`](codigos-error.md) | Formato `{ error, code }` y lista de códigos de error de la API |
| [`CONTRATO_AUTENTICACION_FRONTEND.md`](CONTRATO_AUTENTICACION_FRONTEND.md) | Contrato de autenticación (login con Google) |
| [`CONTRATO_FRONTEND_HU-2.3.md`](CONTRATO_FRONTEND_HU-2.3.md) | HU-2.3: resumen de participación |
| [`CONTRATO_FRONTEND_HU-3.1.md`](CONTRATO_FRONTEND_HU-3.1.md) | HU-3.1: generar quices acumulativos |
| [`CONTRATO_FRONTEND_HU-3.2.md`](CONTRATO_FRONTEND_HU-3.2.md) | HU-3.2: responder quiz y recibir nota |
| [`CONTRATO_FRONTEND_HU-3.3.md`](CONTRATO_FRONTEND_HU-3.3.md) | HU-3.3: exportar mazos y quices a PDF |

Colecciones Postman: en la raíz del repositorio (`*.postman_collection*`).

## Flujos y cambios funcionales

| Documento | Contenido |
| --- | --- |
| [`FLUJO_AUTENTICACION.md`](FLUJO_AUTENTICACION.md) | Autenticación y control de roles (HU-5.4) |
| [`FLUJO_PERFIL_ACADEMICO.md`](FLUJO_PERFIL_ACADEMICO.md) | Perfil académico (HU-5.2) |
| [`FLUJO_REVISION_TARJETAS.md`](FLUJO_REVISION_TARJETAS.md) | Revisión de tarjetas: individual vs. coautoría |
| [`CAMBIO_APORTE_ESTADO.md`](CAMBIO_APORTE_ESTADO.md) | Columna `aporte.estado` y ajustes de coautorías |
| [`CAMBIO_REPASO_SM2.md`](CAMBIO_REPASO_SM2.md) | Repaso SM-2 (HU-4.1) |
| [`CHANGELOG_BACKEND.md`](CHANGELOG_BACKEND.md) | Detalle técnico por sesión (el resumen está en [`../CHANGELOG.md`](../CHANGELOG.md)) |

## Pruebas y seguridad

| Documento | Contenido |
| --- | --- |
| [`INFORME_PRUEBAS_FUNCIONALES.md`](INFORME_PRUEBAS_FUNCIONALES.md) | Informe de pruebas funcionales |
| [`../backend/pruebas-funcionales/README.md`](../backend/pruebas-funcionales/README.md) | Cómo ejecutar las pruebas funcionales de la API |
| [`../backend/security-suite/README.md`](../backend/security-suite/README.md) | Suite OWASP |
| [`../backend/Auditoria_OWASP_Top10_2025.md`](../backend/Auditoria_OWASP_Top10_2025.md) | Auditoría OWASP Top 10:2025 |

## Contexto, decisiones y trazabilidad (`docs/ai/`)

| Documento | Contenido |
| --- | --- |
| [`ai/CONTEXTO_PROYECTO.md`](ai/CONTEXTO_PROYECTO.md) | Origen, problema, stack, arquitectura en 5 capas, modelo de datos, despliegue y calidad |
| [`ai/DECISIONES.md`](ai/DECISIONES.md) | Registro de decisiones del proyecto (DP-nn) |
| [`ai/REGLAS.md`](ai/REGLAS.md) | Reglas de trabajo |
| [`ai/README_HITL.md`](ai/README_HITL.md) | Guía del SUPERPROMPT y del protocolo con humano en el circuito |
| [`ai/TRAZABILIDAD.md`](ai/TRAZABILIDAD.md) | Registro de cambios asistidos por IA |
| `ai/Backlog_HU.xlsx` | Backlog de historias de usuario y criterios de aceptación |
| `ai/Bitacora_de_prompts.xlsx` | Bitácora de prompts |

Otros archivos de la raíz relevantes: [`../CLAUDE.md`](../CLAUDE.md) (contexto y decisiones del equipo), `../init.sql` (esquema oficial) y `../seed.sql` (datos de prueba).

## Arquitectura

| Documento | Contenido |
| --- | --- |
| [`arquitectura/arc42/README.md`](arquitectura/arc42/README.md) | Documentación de arquitectura en 12 secciones (arc42): contexto, bloques, ejecución, despliegue, decisiones, calidad y riesgos |

## Gobernanza del proyecto

| Documento | Contenido |
| --- | --- |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Flujo de ramas, commits, Pull Requests y uso de IA |
| [`../SECURITY.md`](../SECURITY.md) | Cómo reportar vulnerabilidades (Security Advisories de GitHub) |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Resumen de cambios (formato Keep a Changelog) |