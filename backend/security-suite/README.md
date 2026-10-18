# NovaCode — Suite OWASP v2

Copia esta carpeta en `backend/security-suite/` (sustituye run.mjs antiguo) y ejecuta `npm.cmd run test:security`.

## Verificaciones automáticas adicionales
- SQLi: consulta parametrizada en repositorio, y dos solicitudes HTTP de búsqueda cuando hay servidor.
- XSS: búsqueda de sinks peligrosos en el frontend y comprobación HTTP de respuesta JSON.
- CSRF: análisis de bearer token/cookies y comprobación HTTP de origen no permitido.
- JWT: registra explícitamente riesgo de `localStorage` como WARN y revocación como SKIP si no hay escenario.
- Supabase RLS: consulta `pg_tables` con lectura únicamente, cuando se proporcionan variables de conexión.

Los estados distinguen PASS/FAIL/WARN/SKIP. No se convierten comprobaciones pendientes en PASS sin evidencia. Las pruebas estáticas de XSS/CSRF no sustituyen el navegador real ni un análisis dinámico ZAP.

## Configurar PowerShell
En la carpeta backend:
```powershell
npm.cmd run test:security
```
Para que encuentre el frontend si la carpeta no se llama exactamente `A-Walking-Dictionary-NovaCode-Front-end` a nivel hermano:
```powershell
$env:SECURITY_FRONTEND_PATH='C:\proyecto-app\A-Walking-Dictionary-NovaCode-Front-end'
```
Para las pruebas HTTP iniciar el backend local con base de datos de pruebas y autenticación activa:
```powershell
$env:SECURITY_BASE_URL='http://127.0.0.1:5000'
npm.cmd run test:security
```
Para RLS, en una terminal local con credenciales de base de PRUEBAS ya configuradas como variables DB_HOST, DB_USER, DB_PASSWORD, DB_NAME y DB_SSL=true, ejecutar el mismo comando. Alternativamente puede usarse SECURITY_DB_URL junto con SECURITY_DB_SSL=true y conexión TLS que valide certificados. No compartir ni guardar secretos en Git. La consulta de RLS es de solo lectura.

El comando puede devolver código de salida 1 si encuentra FAIL: es intencional para CI. Los reportes se encuentran en `security-suite/reports/` y se recomienda ignorarlos en Git. La prueba de revocación sigue pendiente hasta tener un ambiente y cuentas dedicadas. El estado WARN en JWT indica riesgo residual conocido.
