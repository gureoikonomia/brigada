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

## Comprobaciones

```powershell
npm run lint
npm run build
```
