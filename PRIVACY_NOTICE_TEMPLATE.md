# Plantilla de aviso de privacidad — NO PUBLICAR SIN COMPLETAR Y VALIDAR

Este documento es una plantilla de trabajo, no un aviso legal válido. Completa cada campo con información comprobada, elimina las instrucciones entre corchetes y solicita una revisión adecuada a la jurisdicción antes de publicarlo. No inventes bases jurídicas, plazos, proveedores ni garantías. No publiques ni actives `PRIVACY_NOTICE_URL` mientras haya campos pendientes.

## Identificación y alcance

- Título y versión del aviso: `[PENDIENTE]`
- Fecha de entrada en vigor y última actualización: `[PENDIENTE]`
- Aplicación, sitio web y países a los que se dirige: `[PENDIENTE: confirmar el ámbito de disponibilidad]`
- Edad mínima prevista: 18 años. El registro pide una declaración de mayoría de edad y guarda su fecha; no verifica la edad ni recoge la fecha de nacimiento.
- Tratamiento de datos de menores de 18 años: `[PENDIENTE: definir el procedimiento, incluidos los datos ya aportados por una persona menor]`

## Responsable del tratamiento

- Nombre legal de la persona responsable: Marta Bosquet Laucirica
- Domicilio postal y país: Agirre Lehendakaria Pl., 2, 48130 Urkitzaur, Bizkaia, España
- Correo y canal para consultas de privacidad: gureoikonomia@gmail.com
- Delegado/a de protección de datos, si procede: `[PENDIENTE]`

## Datos tratados y procedencia

Confirma en el código y con los proveedores qué datos se recogen realmente. No afirmes que se usan analítica, publicidad, identificadores de seguimiento o diagnósticos si no están habilitados.

- Cuenta: nombre, correo electrónico, contraseña almacenada mediante hash, rol, estado de actividad, avatar (URL e identificador del proveedor), usuarios bloqueados, fecha de alta/actualización y fecha de confirmación declarada de mayoría de edad. No se recoge la fecha de nacimiento.
- Inicio de sesión: identificador de sesión y vencimiento, cookies de sesión `HttpOnly` y cookie CSRF. La aplicación conserva el perfil en `localStorage`, pero no almacena allí la contraseña ni el token JWT.
- Incidencias: título, descripción, categoría, estado de moderación, coordenadas y dirección, fotos (URL e identificador del proveedor), autor, votos y fechas de creación/actualización.
- Comunidad y moderación: votos, denuncias (incidencia, persona denunciante, motivo, detalles opcionales, estado y datos de revisión) y relaciones de bloqueo.
- Recuperación y eliminación: tokens aleatorios de un solo uso, almacenados como hashes, para recuperación de contraseña, verificación/cambio de email y solicitud de eliminación.
- Datos técnicos, registros de seguridad, cookies y limitación de peticiones: `[PENDIENTE: confirmar qué IP u otros datos técnicos conservan el hosting, el backend y el almacenamiento del limitador, durante cuánto tiempo y quién puede acceder]`
- Datos que proceden de la persona usuaria, el dispositivo, proveedores o fuentes públicas: `[PENDIENTE]`
- Campos obligatorios y opcionales, y consecuencias de no facilitarlos: `[PENDIENTE]`

### Plazos técnicos observados en el código (no sustituyen la política de conservación)

- Sesiones: el registro tiene una fecha de expiración y un índice TTL; el JWT tiene una duración configurable de hasta 24 horas. Confirma la configuración de producción y el retraso real de borrado TTL de MongoDB.
- Recuperación de contraseña: el enlace caduca a los 30 minutos; los tokens vencidos se eliminan mediante TTL.
- Verificación/cambio de correo: el enlace caduca a las 24 horas; los tokens vencidos se eliminan mediante TTL.
- Eliminación de cuenta: el enlace externo caduca a las 24 horas. Al confirmar se borra la cuenta y sus sesiones; se quitan las fotos, los votos de esa cuenta y los vínculos directos de autor/revisor/denunciante. Se conservan el contenido y la ubicación exacta de incidencias y el contenido de denuncias según los plazos descritos abajo. La eliminación de fotos en Cloudinary se ejecuta mediante una cola con reintentos, por lo que puede no ser inmediata.
- Incidencias: no se borran automáticamente por antigüedad. Al eliminar la cuenta autora, se retiran sus fotos y el vínculo de autoría, pero el texto y la ubicación permanecen.
- Votos: al borrar la cuenta se eliminan sus votos; los votos de otras personas sobre incidencias conservadas permanecen.
- Denuncias: las pendientes no tienen borrado automático hasta su revisión; las revisadas se eliminan mediante TTL aproximadamente 365 días después de la fecha de revisión.
- Copias de seguridad y registros operativos: los plazos dependen de la configuración de proveedores y despliegue; verificar antes de publicar.

## Finalidades y bases jurídicas

Describe por separado la creación y seguridad de cuentas, inicio de sesión y sesiones, incidencias, ubicación, fotos, votos, moderación y denuncias, prevención de abuso, recuperación de contraseña, solicitudes de eliminación y comunicaciones de servicio. Para cada finalidad, documenta la base jurídica que corresponda; no presumas que todas requieren consentimiento.

- Finalidad y categorías de datos: `[PENDIENTE]`
- Base jurídica y análisis de su aplicación: `[PENDIENTE]`
- Si se usa consentimiento: forma de otorgarlo, retirarlo y efecto de retirarlo: `[PENDIENTE]`
- Intereses legítimos y ponderación, si se invocan: `[PENDIENTE]`
- Decisiones automatizadas o perfilado, si los hubiera: `[PENDIENTE]`

## Ubicación, cámara y fotografías

- La ubicación del dispositivo se solicita solo cuando la persona pulsa la acción correspondiente: confirmar y describir el uso real: `[PENDIENTE]`
- Si la ubicación exacta, dirección o coordenadas se muestran públicamente: `[PENDIENTE]`
- Uso de cámara y selector de fotos; acceso limitado a los elementos elegidos: `[PENDIENTE]`
- Metadatos de fotos, tratamiento/retirada de EXIF y visibilidad de las imágenes: `[PENDIENTE]`
- Cómo denegar o revocar permisos desde iOS/Android y qué funciones dejarán de estar disponibles: `[PENDIENTE]`

## Contenido aportado por usuarios y moderación

- Qué texto, nombre, ubicación y fotos se publican y quién puede verlos: `[PENDIENTE: confirmar visibilidad pública exacta y añadir advertencia para no incluir datos personales]`
- Reglas de uso, revisión previa, respuesta a denuncias y medidas ante incumplimientos: `[PENDIENTE: documentar el proceso y las medidas]`
- Revisión de denuncias: el Ayuntamiento ha confirmado que revisará las denuncias en un plazo de hasta 7 días hábiles. `[PENDIENTE: definir el canal de escalado si no se cumple el plazo]`
- Qué implica bloquear a una persona y cómo gestionar o retirar un bloqueo: `[PENDIENTE]`
- Canal para denunciar contenido o contactar con moderación: `[PENDIENTE]`
- Procedimiento para solicitar retirada de contenido y posibles excepciones de conservación: `[PENDIENTE]`

## Conservación y eliminación

- Cuentas activas/inactivas: no hay borrado automático por inactividad; los datos se conservan hasta que la persona solicite y confirme el borrado de cuenta.
- Incidencias: se conservan mientras exista la cuenta. Al borrar la cuenta, se retiran las fotos y el vínculo directo con su autor; se conserva el texto, la dirección y las coordenadas tal como se publicaron. Estos datos pueden seguir identificando a personas y no deben describirse como anónimos sin evaluación adicional.
- Votos: se elimina el vínculo de los votos de la cuenta que se borra; se conservan los votos de otras personas sobre incidencias que continúan publicadas.
- Denuncias: las pendientes se conservan hasta su revisión; las resueltas se eliminan automáticamente aproximadamente 12 meses (365 días) después de la revisión. Al borrar una cuenta, se elimina la relación directa con el denunciante, pero el contenido de la denuncia se conserva hasta que venza el plazo.
- Plazo o criterio para bloqueos, confirmación de mayoría de edad, sesiones, logs y backups: `[PENDIENTE]`
- Procedimiento para borrar una cuenta: se puede solicitar desde la app o desde la URL pública indicada en este aviso. La solicitud externa se confirma mediante un enlace enviado al correo de la cuenta, válido durante 24 horas. Se eliminan los datos de cuenta, las sesiones, los votos de esa cuenta, las fotos y los vínculos directos con el autor/denunciante; se conservan el contenido y la ubicación exacta de las incidencias, que podrían seguir identificando a personas. Las denuncias se conservan según el plazo indicado arriba.
- Plazos de borrado en proveedores, copias de seguridad y colas de eliminación: `[PENDIENTE: Cloudinary se procesa mediante una cola con reintentos; confirmar plazo máximo y backups]`
- Datos que deban conservarse por obligaciones o reclamaciones y fundamento: `[PENDIENTE]`

## Destinatarios, encargados y transferencias

Verifica la lista vigente, el papel contractual, la ubicación de datos y los enlaces oficiales de privacidad de cada proveedor. Entre los componentes que deben revisarse están MongoDB Atlas, Cloudinary, Gmail SMTP, Netlify, Render, OpenStreetMap/Nominatim y los proveedores de teselas de mapas.

- Proveedor, servicio, datos compartidos y función: la configuración/código contempla MongoDB para cuentas, incidencias y datos operativos; Cloudinary para imágenes; Gmail SMTP para correo; Netlify/Render para frontend y API; y servicios de geocodificación/mapas para buscar direcciones y mostrar mapas. Confirma qué proveedores y servicios están habilitados realmente en producción y qué datos reciben.
- Ubicación de datos y subencargados: `[PENDIENTE]`
- Transferencias internacionales y garantías aplicables: `[PENDIENTE]`
- Enlaces a avisos de privacidad de terceros y posibles controles del usuario: `[PENDIENTE]`

## Derechos y reclamaciones

- Cómo ejercer acceso, rectificación, supresión, limitación, oposición y portabilidad cuando corresponda: `[PENDIENTE]`
- Canal de contacto, verificación de identidad y plazo de respuesta: `[PENDIENTE]`
- Enlace público para solicitar la eliminación de una cuenta (disponible tras desplegar la versión actual): `https://appbrigada.netlify.app/eliminar-cuenta`
- Derecho a reclamar ante la autoridad de control competente y sus datos: `[PENDIENTE]`

## Seguridad, cookies y comunicaciones

- Cookies de sesión y CSRF: finalidad, duración y controles disponibles: `[PENDIENTE]`
- Medidas de seguridad descritas sin revelar detalles que faciliten ataques: `[PENDIENTE]`
- Notificación de incidentes de seguridad y canal de contacto: `[PENDIENTE]`
- Correos operativos, recuperación de cuenta y preferencias de comunicación: `[PENDIENTE]`
- Analítica, publicidad, notificaciones push o SDK de terceros: confirmar si existen; si no, no atribuirlos: `[PENDIENTE]`

## Cambios del aviso

- Cómo se comunicarán los cambios materiales y dónde consultar versiones anteriores: `[PENDIENTE]`
- Fecha, número de versión y responsable de aprobación: `[PENDIENTE]`

## Lista de revisión antes de publicar

- [ ] Se han completado todos los campos pendientes con datos comprobados.
- [ ] El aviso coincide con el funcionamiento actual de la app y los contratos de proveedores.
- [ ] Las bases jurídicas, derechos, plazos, menores y transferencias se han revisado.
- [ ] La URL pública funciona sin iniciar sesión y está enlazada desde las fichas de las tiendas.
- [ ] La versión publicada está disponible en español y euskera si ambos idiomas se ofrecen en la app.
