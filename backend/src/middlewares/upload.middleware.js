import multer from 'multer';

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Guardamos en memoria (buffer) en vez de en disco: así upload.service.js
// puede subir directamente el buffer a donde corresponda (S3, Cloudinary, GridFS...)
// sin dejar archivos temporales sueltos en el servidor.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  // Aceptamos las imágenes estándar y también octet-stream si vienen de herramientas como Postman
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const isOctetStream = file.mimetype === 'application/octet-stream';

  if (!isAllowedMime && !isOctetStream) {
    // Lanzas un Error normal, no un MulterError
    return cb(new Error(`Formato no permitido (${file.mimetype}). Solo se aceptan JPEG, PNG o WEBP`));
  }
  
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 5, // máximo 5 imágenes por incidencia
  },
});

// Para el formulario de creación de incidencia: campo "images", hasta 5 ficheros
const uploadIncidentImages = upload.array('images', 5);

// Wrapper para convertir los errores de Multer en respuestas JSON limpias
// en vez de dejar que exploten como error 500 genérico.
// upload.middleware.js
export function handleUploadErrors(req, res, next) {
  uploadIncidentImages(req, res, (err) => {
    // Errores propios de Multer (tamaño, número de archivos)
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(400)
          .json({ message: `Cada imagen debe pesar menos de ${MAX_FILE_SIZE_MB}MB` });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'Has superado el límite de 5 imágenes' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          message: `El campo '${err.field}' no es válido. Usa 'images' para enviar fotos.` 
        });
      }
      return res.status(400).json({ message: 'Error subiendo las imágenes' });
    }

    // Errores personalizados (como el de formato de archivo de nuestro fileFilter)
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    return next();
  });
}

export default {
  handleUploadErrors,
};