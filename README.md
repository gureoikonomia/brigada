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
- Configura Resend con un dominio de envío verificado (SPF/DKIM y, si procede, DMARC). Prueba recuperación de contraseña y notificaciones desde una cuenta real.
- Usa HTTPS para el frontend y la API. En el hosting del backend define `NODE_ENV=production`, `PORT` según la plataforma, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN` (máximo 24 h; por defecto 1 h), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `FRONTEND_URL`, `CORS_ORIGINS`, `TRUST_PROXY_HOPS`, `PRIVACY_NOTICE_URL` y `PRIVACY_NOTICE_VERSION`.
- Genera `JWT_SECRET` con un generador criptográfico, por ejemplo `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. No reutilices claves ni incluyas secretos en Git, capturas, logs o variables `VITE_*`. Si alguna clave real estuvo publicada, revócala y genera otra.
- `FRONTEND_URL` debe ser el origen HTTPS del sitio, sin ruta ni barra final. `CORS_ORIGINS` debe contener ese mismo origen y cualquier otro frontend legítimo, separados por comas; no uses comodines. En el hosting del frontend configura `VITE_API_URL` con el origen HTTPS de la API seguido de `/api`.
- La autenticación usa cookies `HttpOnly` y requiere cookies cross-site en la configuración actual (Netlify y Render tienen dominios distintos). Verifica login, recarga y logout en Safari, Firefox y navegadores móviles con sus protecciones de privacidad activadas. Si bloquean las cookies, publica frontend y API bajo subdominios del mismo dominio registrable antes de abrir el acceso; no vuelvas a guardar JWT en `localStorage` como alternativa.
- Registro, verificación y recuperación requieren un origen permitido y JSON, pero no dependen de la cookie CSRF cross-site; las operaciones autenticadas siguen exigiendo cookie y token CSRF. Esto no resuelve el bloqueo de la cookie de sesión: en ese caso se necesitan dominios propios del mismo sitio registrable.
- Configura `TRUST_PROXY_HOPS` con el número de proxies de confianza entre Internet y Express según el proveedor. No confíes en cabeceras de proxy arbitrarias; valida también que el limitador de peticiones ve las IP reales.
- Los índices declarados por los modelos y los contadores compartidos de rate limit se crean antes de aceptar tráfico. Verifica que el usuario de Atlas pueda crear índices; el arranque falla explícitamente si no puede hacerlo. El endpoint de salud queda fuera del limitador que depende de Mongo para seguir informando de desconexiones.
- `frontend/.env` es configuración local y no se versiona. En producción, el build falla si `VITE_API_URL` no es una URL HTTPS pública; configura esa variable en Netlify.
- En Netlify, conserva `frontend/public/_redirects` para que las rutas de React (por ejemplo, perfiles e incidencias) vuelvan a `index.html`. Revisa `frontend/public/_headers` y permite en la CSP la URL real de la API, Cloudinary y los servicios de mapas.
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

### Después de publicar

- Comprueba `/api/health`, el frontend y los flujos críticos desde fuera de tu red. Revisa los registros de despliegue y confirma que no contienen tokens, contraseñas ni datos personales innecesarios.
- Activa monitorización/alertas de disponibilidad, errores, consumo de Cloudinary/Resend, almacenamiento de MongoDB y gasto. Establece un procedimiento para incidentes de seguridad, restauración y rollback.
- Mantén Node.js y dependencias actualizados, revisa avisos de seguridad periódicamente y repite las pruebas tras cambios de permisos, autenticación, uploads o despliegue.

### Cambios de sesión incluidos

Los JWT llevan una versión global de sesión y un identificador individual (`jti`) respaldado por un registro en MongoDB. Cada ruta autenticada comprueba que ese registro exista y no haya caducado. Cerrar sesión revoca solo el dispositivo actual; cambiar o restablecer una contraseña, cambiar el email y desactivar/activar una cuenta invalida todas las sesiones anteriores. Los registros caducados se eliminan mediante un índice TTL, y la aplicación también rechaza explícitamente los registros cuya fecha de expiración ya pasó.

Al desplegar esta versión, los JWT anteriores no tienen `jti` ni registro de sesión y dejarán de autenticarse; todas las personas tendrán que iniciar sesión de nuevo. El arranque crea los índices del nuevo modelo, por lo que el usuario de MongoDB debe tener permiso para crearlos. No hagas rollback a una versión anterior que no compruebe los registros de sesión: volvería a aceptar JWT revocados. Si hay que revertir, usa una versión que conserve esta validación o mantén el servicio fuera de tráfico hasta desplegar una corrección compatible.
