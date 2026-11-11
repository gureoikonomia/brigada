# Brigada

Aplicación web para comunicar y gestionar incidencias comunitarias.

## Desarrollo local

Requisitos: Node.js 22.12 o posterior y una instancia MongoDB accesible con
soporte de replica set/transacciones (Atlas cumple este requisito).

1. Copia `backend/.env.example` a `backend/.env` y configura MongoDB, Cloudinary y el correo de pruebas.
2. Copia `frontend/.env.example` a `frontend/.env` y configura `VITE_API_URL`.
3. Instala e inicia cada parte en terminales separadas:

```powershell
Set-Location backend
npm ci
npm run dev
```

```powershell
Set-Location frontend
npm ci
npm run dev
```

## Preparación para producción

No publiques hasta completar esta lista. El código no puede configurar ni verificar tus cuentas externas.

### Servicios, dominios y secretos

- Crea bases de datos de producción separadas de `test` y desarrollo. En MongoDB, usa un usuario de base de datos con permisos mínimos, restringe el acceso de red, exige TLS y configura copias de seguridad automáticas. Prueba que puedes restaurar una copia.
- Configura un Cloudinary de producción con credenciales propias. Las fotos de incidencias se sirven mediante URL; no subas imágenes con datos personales o sensibles y define límites/alertas de uso y facturación.
- Configura Gmail con verificación en dos pasos y una contraseña de aplicación para el envío SMTP. Para producción con volumen, prefiere un proveedor de correo transaccional con dominio verificado.
- **No publiques esta versión:** el registro registra una declaración de mayoría de edad, pero todavía no muestra ni exige aceptación del aviso de privacidad y las condiciones de uso. Publica esos documentos y añade la aceptación explícita antes de abrir el registro.
- Usa HTTPS para el frontend y la API. En el hosting del backend define `NODE_ENV=production`, `PORT` según la plataforma, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN` (máximo 24 h; por defecto 1 h), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `FRONTEND_URL`, `CORS_ORIGINS` y `TRUST_PROXY_HOPS`. `GMAIL_APP_PASSWORD` debe ser una contraseña de aplicación, nunca la contraseña normal.
- Genera `JWT_SECRET` con un generador criptográfico, por ejemplo `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. No reutilices claves ni incluyas secretos en Git, capturas, logs o variables `VITE_*`. Si alguna clave real estuvo publicada, revócala y genera otra.
- `FRONTEND_URL` debe ser el origen HTTPS del sitio, sin ruta ni barra final. `CORS_ORIGINS` debe contener ese mismo origen y cualquier otro frontend legítimo, separados por comas; no uses comodines. El origen `https://appbrigada.netlify.app` también está permitido explícitamente por el backend en producción.
- En producción, el frontend llama a `/api` en su propio dominio y Netlify lo reenvía a la API de Render mediante la regla de `frontend/public/_redirects`. Mantén esa regla al desplegar y no configures `VITE_API_URL` en Netlify. Esto sirve las cookies `HttpOnly` y CSRF desde el mismo dominio visible para el navegador, sin depender de cookies cross-site ni guardar JWT en `localStorage`.
- El cliente móvil se prepara con Capacitor (`frontend/capacitor.config.json`). Las llamadas nativas usan `VITE_NATIVE_API_URL` hacia la API pública; los orígenes predeterminados de iOS/Android solo se añaden para CORS/CSRF. La autenticación sigue basada en cookies `HttpOnly`; valida su persistencia en dispositivos antes de publicar y no guardes JWT en `localStorage`.
- Registro, verificación y recuperación requieren un origen permitido y JSON; las operaciones autenticadas siguen exigiendo cookie y token CSRF. Verifica login, recarga y logout en Safari, Firefox y navegadores móviles con sus protecciones de privacidad activadas.
- Configura `TRUST_PROXY_HOPS` con el número de proxies de confianza entre Internet y Express según el proveedor. No confíes en cabeceras de proxy arbitrarias; valida también que el limitador de peticiones ve las IP reales.
- Los índices declarados por los modelos y los contadores compartidos de rate limit se crean antes de aceptar tráfico. Verifica que el usuario de Atlas pueda crear índices; el arranque falla explícitamente si no puede hacerlo. El endpoint de salud queda fuera del limitador que depende de Mongo para seguir informando de desconexiones.
- `frontend/.env` es configuración local y no se versiona. `VITE_API_URL` se usa solo en desarrollo local.
- En Netlify, conserva en `frontend/public/_redirects` tanto la regla de proxy `/api/*` como la regla SPA para que las rutas de React (por ejemplo, perfiles e incidencias) vuelvan a `index.html`. Revisa `frontend/public/_headers` y permite los servicios de Cloudinary y mapas utilizados.
- Crea y prueba una cuenta administradora mediante un procedimiento privado y controlado; el registro público crea usuarios normales. No guardes credenciales de administración en el repositorio.

### Antes de abrir el acceso público

- Revisa los avisos y vulnerabilidades de dependencias en **ambos** proyectos:

```powershell
Set-Location backend
npm audit
Set-Location ..\frontend
npm audit
```

- Ejecuta las comprobaciones disponibles:

```powershell
Set-Location backend
node --check src/server.js
npm test
Set-Location ..\frontend
npm run lint
npm run build
```

- La suite automatizada actual cubre versiones de sesión, CSRF, cookies, visibilidad de incidencias votadas y límites de validación; no sustituye pruebas de integración. Antes del lanzamiento, prueba en un entorno de preproducción: registro/verificación/login/logout, permisos de user/moderator/admin, reportes, moderación, votos duplicados, fotos, edición y borrado de incidencias, cambio de correo y contraseña, recuperación de contraseña, eliminación de cuenta, avatares, idiomas, rutas directas y vista móvil.
- Comprueba que un usuario normal no puede ver autores ni detalles de incidencias privadas votadas; que cerrar sesión no borra incidencias ni sus fotos; que los enlaces de recuperación expiran y que cambiar/restablecer la contraseña invalida las sesiones anteriores.
- Configura cabeceras de seguridad del frontend en el hosting, especialmente una Content Security Policy compatible con los dominios realmente usados (API, Cloudinary y mapas). Activa HTTPS/HSTS en el dominio una vez validado HTTPS. No habilites una política CSP a ciegas: podría romper mapas o fotos.
- Define límites de retención y eliminación, proceso de moderación y contacto de soporte. Prepara aviso de privacidad, condiciones de uso y aviso legal adecuados a la jurisdicción; valida el tratamiento de emails, ubicaciones, fotos, cuentas y solicitudes de privacidad con asesoramiento apropiado.
- La URL externa para solicitar la eliminación de cuenta será `https://appbrigada.netlify.app/eliminar-cuenta` tras desplegar esta versión. Pruébala con email real en preproducción antes de incluirla en Google Play. La app permite denunciar incidencias y bloquear autores; el Ayuntamiento ha confirmado que revisará las denuncias en un plazo de hasta 7 días hábiles. Define un canal de escalado si se incumple el plazo antes de publicar.
- Al borrar una cuenta, la implementación conserva el texto y la ubicación exacta de sus incidencias, pero elimina el vínculo directo con su autor, las fotos y los votos de esa cuenta. También conserva las denuncias sin vincularlas con quien las envió, hasta aproximadamente 12 meses después de su revisión. El texto y la ubicación pueden seguir identificando a personas; no describas este tratamiento como anonimización completa y revisa el aviso con asesoría adecuada.
- Completa [`PRIVACY_NOTICE_TEMPLATE.md`](./PRIVACY_NOTICE_TEMPLATE.md) con datos reales y revisión legal antes de abrir el registro o enlazar el aviso en las tiendas. La plantilla no es un aviso válido ni sustituye las condiciones de uso o el aviso legal.

### Después de publicar

- Comprueba `/api/health`, el frontend y los flujos críticos desde fuera de tu red. Revisa los registros de despliegue y confirma que no contienen tokens, contraseñas ni datos personales innecesarios.
- Activa monitorización/alertas de disponibilidad, errores, consumo de Cloudinary, correo, almacenamiento de MongoDB y gasto. Establece un procedimiento para incidentes de seguridad, restauración y rollback.
- Mantén Node.js y dependencias actualizados, revisa avisos de seguridad periódicamente y repite las pruebas tras cambios de permisos, autenticación, uploads o despliegue.

### Cambios de sesión incluidos

Los JWT llevan una versión global de sesión y un identificador individual (`jti`) respaldado por un registro en MongoDB. Cada ruta autenticada comprueba que ese registro exista y no haya caducado. Cerrar sesión revoca solo el dispositivo actual; cambiar o restablecer una contraseña, cambiar el email y desactivar/activar una cuenta invalida todas las sesiones anteriores. Los registros caducados se eliminan mediante un índice TTL, y la aplicación también rechaza explícitamente los registros cuya fecha de expiración ya pasó.

Al desplegar esta versión, los JWT anteriores no tienen `jti` ni registro de sesión y dejarán de autenticarse; todas las personas tendrán que iniciar sesión de nuevo. El arranque crea los índices del nuevo modelo, por lo que el usuario de MongoDB debe tener permiso para crearlos. No hagas rollback a una versión anterior que no compruebe los registros de sesión: volvería a aceptar JWT revocados. Si hay que revertir, usa una versión que conserve esta validación o mantén el servicio fuera de tráfico hasta desplegar una corrección compatible.
