# Frontend

## Variables de entorno

Configura `VITE_API_URL` como la URL pública HTTPS del backend terminada en `/api`. El build de producción rechaza localhost o URLs HTTP.
Por ejemplo, en el entorno local:

```env
VITE_API_URL=http://localhost:3000/api
```

En Netlify, añade la URL HTTPS del backend en las variables de entorno de
producción y vuelve a desplegar. Vite incluye los valores `VITE_*` en el bundle:
no pongas secretos en ellos.

## Despliegue en Netlify

- Publica el directorio `dist` generado por `npm run build`.
- Conserva `public/_redirects` para que las rutas de React Router carguen al
  abrirse directamente o al recargar la página.
- Revisa `public/_headers`: la CSP debe permitir el dominio real de la API,
  Cloudinary y los proveedores de mapas que utilice el sitio.
- Configura `VITE_API_URL` y el origen del sitio en `CORS_ORIGINS` del backend.

La sesión usa cookies `HttpOnly` y CSRF. Si frontend y API están en dominios
distintos, las cookies dependen del soporte de cookies cross-site del navegador.
Antes de publicar, prueba registro, login, recarga y logout con las protecciones
de privacidad habituales; si el navegador bloquea las cookies, usa subdominios
del mismo dominio registrable para el frontend y la API.

## Comprobaciones

```powershell
npm run lint
npm run build
```
