# Brigada

Brigada es una aplicación web y móvil para que la comunidad publique y consulte incidencias locales. Permite aportar ubicación y fotos, votar y enviar denuncias para su moderación.

## Funcionalidades

- Publicación y consulta geográfica de incidencias, con fotos y votos.
- Denuncias, moderación y gestión de usuarios según el rol.
- Cuentas con verificación de correo, recuperación de contraseña y solicitud de eliminación.
- Interfaz en español y euskera; cliente móvil con Capacitor.

## Stack y arquitectura

- **Frontend:** React 19.2.8, Vite 8.2.2, React Router 7.18.2 y Capacitor 8.6.0.
- **Backend:** Node.js `>=22.12.0`, Express 5.2.1 y Mongoose 9.12.1.
- **Datos y servicios:** MongoDB; Cloudinary para imágenes y SMTP de Gmail para correo.
- **Despliegue descrito en la documentación:** frontend estático en Netlify, proxy de API hacia Render y MongoDB Atlas. El repositorio no incluye los ajustes de las cuentas de hosting ni permite confirmar sus valores de producción.

El frontend sirve la interfaz React y envía las llamadas API al backend Express. Mongoose accede a MongoDB; el backend también usa Cloudinary para imágenes y correo SMTP para flujos de cuenta. Las versiones indicadas son las declaradas en los `package.json` y algunas son rangos semver.

## Requisitos y desarrollo local

Necesitas Node.js 22.12 o posterior, npm y MongoDB accesible con soporte de transacciones (por ejemplo, un replica set local o Atlas).

Desde la raíz, crea los archivos de entorno:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Configura `backend\.env`, en particular `MONGODB_URI` y `JWT_SECRET`. Para usar correo o subir imágenes localmente, configura también las credenciales correspondientes. `frontend\.env.example` ya contiene la URL local del backend; ajústala si usas otro host o puerto.

Instala e inicia cada parte en una terminal:

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

El frontend de desarrollo usa `http://localhost:5173` y el backend `http://localhost:3000` por defecto. El backend escucha en `PORT` si se define.

## Variables de entorno

Los ejemplos son ficticios. Las variables marcadas como obligatorias en producción se validan al arrancar, salvo las indicadas como requeridas por el servicio de correo. En desarrollo local pueden usarse valores locales o dejar vacías las credenciales de servicios que no se prueben.

### Backend

| Variable                | Descripción                                                                                                                      | Obligatoria                    | Ejemplo ficticio                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| `NODE_ENV`              | Entorno; usa `production` en producción.                                                                                         | No; recomendado en producción  | `development`                                             |
| `PORT`                  | Puerto HTTP; por defecto, `3000`.                                                                                                | No                             | `3000`                                                    |
| `MONGODB_URI`           | Conexión a MongoDB. En producción debe usar TLS.                                                                                 | Sí en producción               | `mongodb://127.0.0.1:27017/brigada?replicaSet=rs0`        |
| `JWT_SECRET`            | Secreto de firma; en producción debe ser aleatorio y tener al menos 32 caracteres.                                               | Sí en producción               | `<secreto-aleatorio-de-32-caracteres-o-mas>`              |
| `JWT_EXPIRES_IN`        | Duración del token de acceso; máximo 1 hora, por defecto 30 minutos.                                                             | No                             | `30m`                                                     |
| `REFRESH_TTL`           | Duración renovable del refresh token; máximo 90 días, por defecto 30 días. La sesión tiene además un tope absoluto de 90 días.   | No                             | `30d`                                                     |
| `CLOUDINARY_CLOUD_NAME` | Nombre de la cuenta Cloudinary.                                                                                                  | Sí en producción; para subidas | `brigada-demo`                                            |
| `CLOUDINARY_API_KEY`    | Clave de API de Cloudinary.                                                                                                      | Sí en producción; para subidas | `<clave-ficticia>`                                        |
| `CLOUDINARY_API_SECRET` | Secreto de API de Cloudinary.                                                                                                    | Sí en producción; para subidas | `<secreto-ficticio>`                                      |
| `GMAIL_USER`            | Cuenta SMTP usada para enviar correo.                                                                                            | Sí en producción y para correo | `brigada@example.test`                                    |
| `GMAIL_APP_PASSWORD`    | Contraseña de aplicación SMTP, no la contraseña normal de la cuenta.                                                             | Sí en producción y para correo | `<xxxx-xxxx-xxxx-xxxx>`                                   |
| `FRONTEND_URL`          | Origen HTTPS del sitio; sin ruta ni barra final.                                                                                 | Sí en producción               | `https://brigada.example.test`                            |
| `CORS_ORIGINS`          | Orígenes web permitidos, separados por comas; debe incluir `FRONTEND_URL`.                                                       | Sí en producción               | `https://brigada.example.test,https://admin.example.test` |
| `TRUST_PROXY_HOPS`      | Número de proxies de confianza delante de Express; en producción debe ser al menos `1` y corresponder a la infraestructura real. | Sí en producción               | `1`                                                       |
| `CLIENT_URL`            | Fallback local para algunos enlaces de cuenta; se prefiere `FRONTEND_URL`.                                                       | No                             | `http://localhost:5173`                                   |

No copies secretos reales al repositorio ni uses secretos en variables `VITE_*`. La plantilla backend contiene también campos de aviso de privacidad que no son leídos actualmente por la aplicación.

### Frontend

| Variable              | Descripción                                                                                | Obligatoria                          | Ejemplo ficticio               |
| --------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------ |
| `VITE_API_URL`        | URL base de la API durante el desarrollo web. En el build web de producción se usa `/api`. | No; útil en desarrollo               | `http://localhost:3000/api`    |
| `VITE_NATIVE_API_URL` | URL base de la API al compilar la app nativa con Capacitor.                                | No; configurable para builds nativos | `https://api.example.test/api` |

Las variables `VITE_*` se incorporan al cliente; no deben contener credenciales ni secretos.

## Autenticación y sesión

El backend entrega un JWT de acceso de corta duración en una cookie `HttpOnly` y un refresh token opaco en otra cookie. Solo se almacena en MongoDB el hash SHA-256 del refresh token. Al renovar, el refresh rota; su duración configurable no puede superar 90 días y ninguna sesión supera el límite absoluto de 90 días. El frontend renueva la sesión cuando el backend indica que expiró el token de acceso.

En producción, las cookies usan `Secure` y `SameSite=None`; el proxy mantiene las llamadas web bajo el origen del frontend. Las operaciones que cambian datos requieren un `Origin` permitido; las operaciones autenticadas también validan el token CSRF de cookie contra la cabecera. El logout revoca la sesión actual. Cambiar o restablecer la contraseña, cambiar el correo y desactivar/reactivar una cuenta invalidan las sesiones anteriores. Hay límites de peticiones para operaciones como login, registro, refresh, subidas, votos y denuncias.

En producción, Netlify reenvía `/api/*` al backend bajo el mismo origen web: el navegador usa las cookies con el frontend como origen visible, sin depender de cookies cross-site. La app móvil se conecta a la API mediante `VITE_NATIVE_API_URL`; hay que probar la persistencia de cookies y CSRF en dispositivos reales.

## Roles y autorización

`user` puede usar las funciones comunitarias autenticadas, como publicar, votar y denunciar. `moderator` puede revisar denuncias y cambiar el estado de incidencias. `admin` puede realizar esas tareas y, además, gestionar usuarios y sus roles, consultar métricas administrativas y editar el contenido de incidencias. Los permisos se aplican en las rutas del backend.

## Scripts y comprobaciones

Ejecuta cada comando desde la carpeta indicada.

**Backend (`backend/`):**

| Comando          | Función                                                        |
| ---------------- | -------------------------------------------------------------- |
| `npm run dev`    | Arranca el servidor con reinicio al cambiar archivos.          |
| `npm start`      | Arranca el servidor sin modo watch.                            |
| `npm test`       | Ejecuta los tests con el runner integrado de Node.js.          |
| `npm run lint`   | Analiza `src` y `test` con Oxlint.                             |
| `npm run format` | Formatea los archivos JS/configuración indicados en el script. |

**Frontend (`frontend/`):**

| Comando                                         | Función                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`                                   | Inicia Vite para desarrollo.                                                      |
| `npm run build`                                 | Genera el sitio de producción en `dist/`.                                         |
| `npm test`                                      | Ejecuta Vitest en modo `run`.                                                     |
| `npm run lint`                                  | Analiza el frontend con Oxlint.                                                   |
| `npm run format`                                | Formatea los archivos indicados en el script.                                     |
| `npm run preview`                               | Sirve localmente el build de Vite.                                                |
| `npm run mobile:sync`                           | Construye la web y sincroniza los proyectos Capacitor.                            |
| `npm run mobile:android` / `npm run mobile:ios` | Sincroniza y abre el proyecto nativo correspondiente. iOS requiere macOS y Xcode. |

Para validar antes de publicar:

```powershell
# En backend/
npm test
npm run lint

# En frontend/
npm test
npm run lint
npm run build
```

Los tests backend cubren autenticación y cambios de correo/contraseña, sesiones y migraciones, CSRF/CORS y límites, seguridad comunitaria, retención y consultas de incidencias. Los tests frontend cubren API y contexto de autenticación. Para ejecutar las pruebas, usa `npm test` en cada carpeta.

## Despliegue

- **Netlify:** publica `frontend/dist`. Conserva `frontend/public/_redirects`: primero reenvía `/api/*` al servicio backend y después aplica el fallback SPA a `index.html`. Conserva también `frontend/public/_headers`; su CSP debe seguir permitiendo únicamente los servicios que use la app.
- **Render:** ejecuta el backend. Configura las variables de producción en el entorno del servicio, no en el repositorio. Ajusta `TRUST_PROXY_HOPS` al número real de proxies de confianza.
- **MongoDB Atlas:** configura `MONGODB_URI` con TLS y permisos suficientes para que el backend cree/verifique índices. No se puede confirmar desde el repositorio la configuración efectiva de cuentas ni los valores de producción.

`CORS_ORIGINS` debe enumerar los orígenes web permitidos e incluir el origen HTTPS configurado en `FRONTEND_URL`; no uses comodines. El backend añade los orígenes de Capacitor que tiene configurados. El proxy `/api/*` mantiene las llamadas web bajo el origen de Netlify y permite que las cookies de sesión sean first-party para el navegador.

### Migraciones y despliegues con cambios de esquema

Para un cambio de esquema o índices que pueda ser incompatible:

1. Haz una copia de seguridad de MongoDB y confirma que se puede restaurar.
2. Suspende el tráfico y asegúrate de que no quedan instancias antiguas usando el esquema previo.
3. Despliega la nueva versión del backend. En el arranque se ejecutan migraciones de índices de sesión, se limpian registros de sesión incompatibles y se crean los índices declarados por los modelos; un error de creación detiene el arranque.
4. Comprueba los logs, los índices y el funcionamiento de los flujos afectados antes de reabrir el tráfico.

El script `backend/scripts/cleanup-legacy-sessions.js` revisa y limpia sesiones incompatibles. Desde `backend/`, con `MONGODB_URI` configurada, ejecuta primero el modo de simulación (predeterminado):

```powershell
node scripts/cleanup-legacy-sessions.js
```

Solo después de detener las instancias antiguas y revisar el resultado, `node scripts/cleanup-legacy-sessions.js --yes` aplica la limpieza. El script se niega a borrar si detecta el índice TTL legado de `expiresAt` y verifica el resultado al terminar.

## Estructura del proyecto

```text
.
├── .vscode/                 Configuración del espacio de trabajo.
├── backend/
│   ├── scripts/             Mantenimiento de datos y sesiones.
│   ├── src/                 API, configuración, modelos y servicios.
│   └── test/                Tests backend.
└── frontend/
    ├── android/, ios/       Proyectos nativos de Capacitor; `ios/App/CapApp-SPM/` aloja dependencias SwiftPM generadas y no debe editarse.
    ├── public/              Assets, reglas de Netlify y cabeceras.
    ├── src/                 Interfaz React.
    └── test/                Tests frontend.
```

## Documentación y licencia

La [plantilla de aviso de privacidad](./PRIVACY_NOTICE_TEMPLATE.md) es un documento de trabajo: contiene campos pendientes y no debe publicarse sin completarlos y validarlos. El `package.json` del backend declara la licencia ISC; el repositorio no contiene un archivo de licencia raíz que confirme el alcance para todo el proyecto.
