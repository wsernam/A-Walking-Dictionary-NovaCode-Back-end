# Política de seguridad

## Versiones con soporte

Solo se corrigen vulnerabilidades en la rama `develop` y en la rama `main` (producción). No hay versiones publicadas anteriores con soporte.

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa los *Security Advisories* privados de GitHub:

1. Ve a la pestaña **Security** del repositorio.
2. Pulsa **Report a vulnerability**.
3. Completa el formulario con la información de la sección siguiente.

Enlace directo: <https://github.com/wsernam/A-Walking-Dictionary-NovaCode-Back-end/security/advisories/new>

## Qué incluir en el reporte

- Descripción de la vulnerabilidad y su impacto.
- Pasos para reproducirla (endpoint, método HTTP, cuerpo de la petición, rol del usuario).
- Versión o commit afectado.
- Si es posible, una propuesta de corrección.
- No incluyas credenciales ni datos personales reales.

## Qué esperar

- El equipo revisará el reporte y responderá por el mismo advisory.
- Si se confirma, se corregirá en una rama aparte y el advisory se publicará una vez desplegada la corrección.
- Pedimos no divulgar la vulnerabilidad públicamente hasta entonces.

## Alcance

Está dentro del alcance el código de este repositorio (API, esquema de base de datos y configuración). Pedimos no ejecutar pruebas automáticas ni de denegación de servicio contra los entornos desplegados (Render, Supabase, Vercel).

## Referencias

- [Auditoría OWASP Top 10:2025](backend/Auditoria_OWASP_Top10_2025.md) con los hallazgos previos.
- [Suite de pruebas de seguridad](backend/security-suite/README.md).