<!-- plantilla_sesion_version: 1.0 -->
# ENCABEZADO DE SESIÓN · {{PROMPT_ID}}

Esta sesión se rige por el SUPERPROMPT (versión de referencia: `{{SP_HUELLA}}`). Si no lo tienes en la conversación, pídelo antes de continuar. Aplica su protocolo de puertas P1 a P5.

- Prompt-ID: **{{PROMPT_ID}}**
- Fecha: {{FECHA}}
- Persona responsable: **{{AUTOR}}** · rol en el Sprint {{SPRINT}}: **{{ROL}}**
- Líder del sprint (aprueba contratos, P2): **{{LIDER}}**
- Repo objetivo: `{{REPO}}` · rama de trabajo: `{{RAMA}}`
- HU: {{HU}}
- Verificación de rol: {{AVISO_ROL}}

## Estado actual del repo objetivo
{{GIT_ESTADO}}

## HU objetivo y criterios de aceptación
{{HU_BLOQUE}}

## Tarea
{{TAREA}}

**Definición de hecho:** {{HECHO}}

## Recordatorio de cierre
Al terminar entrega el bloque `RESULTADO_PARA_BITACORA` con `prompt_id: {{PROMPT_ID}}` y, si la persona pide commit, el trailer `Prompt-ID: {{PROMPT_ID}}`.
