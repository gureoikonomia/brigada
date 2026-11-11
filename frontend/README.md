# Frontend

## Variables de entorno

Para desarrollo local, configura `VITE_API_URL` con la URL del backend:

```env
VITE_API_URL=http://localhost:3000/api
```

En producción, la aplicación usa `/api` en el mismo dominio del frontend. No
configures `VITE_API_URL` en Netlify: el archivo `public/_redirects` hace de
proxy hacia la API para que las cookies de sesión sean first-party.

## Despliegue en Netlify

- Publica el directorio `dist` generado por `npm run build`.
- Conserva `public/_redirects` para que las rutas de React Router carguen al
  abrirse directamente o al recargar la página.
- Revisa `public/_headers`: la CSP debe permitir Cloudinary y los proveedores
  de mapas que utilice el sitio. La API se solicita en el mismo dominio.
- La CSP permite por hash el script inline de la insignia pública de Netlify;
  conserva esa excepción específica y no la sustituyas por `'unsafe-inline'`.
- Conserva la regla `/api/*` de `public/_redirects` y configura el origen del
  sitio en `CORS_ORIGINS` del backend.

La sesión usa cookies `HttpOnly` y CSRF. En producción, el proxy hace que el
navegador solicite la API desde el mismo dominio del frontend, evitando depender
de cookies cross-site. Antes de publicar, prueba registro, login, recarga y
logout en los navegadores habituales.

## Aplicaciones móviles

El proyecto usa Capacitor para reutilizar React en iOS y Android. Desde esta
carpeta, `npm run mobile:sync` compila la web y sincroniza los proyectos nativos;
`npm run mobile:android` y `npm run mobile:ios` los abren en Android Studio y
Xcode, respectivamente. La autenticación móvil llama a la API pública mediante
`VITE_NATIVE_API_URL`; los orígenes locales predeterminados de Capacitor están
permitidos en CORS y CSRF. No cambies la autenticación por tokens en
`localStorage`.

La app nativa debe probar login, persistencia de cookies y CSRF en dispositivos
iOS y Android antes de distribuirse. La API sigue estando en Netlify/Render y
necesita conexión de red; el contenedor Capacitor no añade modo sin conexión ni
notificaciones nativas por sí solo. iOS requiere macOS y Xcode para compilar y
firmar.

La solicitud pública para eliminar una cuenta estará disponible en
`https://appbrigada.netlify.app/eliminar-cuenta` después de desplegar esta
versión. Incluye solicitud por correo y confirmación de un solo uso; verifica el
flujo real de correo y borrado en preproducción antes de incluir el enlace en
las fichas de App Store y Google Play. La app permite denunciar incidencias y
bloquear a sus autores; las denuncias pendientes aparecen en la pestaña de
moderación.

## Comprobaciones

```powershell
npm run lint
npm run build
```
