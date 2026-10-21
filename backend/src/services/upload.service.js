import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER = 'incidents';
const AVATAR_FOLDER = 'avatars';

/**
 * Sube un único buffer (el que llega de multer en memoria) a Cloudinary
 * usando un stream, sin escribir nada a disco.
 */
function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // limitamos el tamaño máximo de salida para no guardar imágenes gigantes
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * Sube varias imágenes en paralelo. req.files (de multer.array) es un array
 * de objetos con { buffer, mimetype, originalname, ... }.
 * Devuelve el mismo formato que espera el campo `images` del modelo Incident.
 */
async function uploadIncidentImages(files = []) {
  if (!files.length) return [];

  const results = await Promise.allSettled(
    files.map((file) => uploadBuffer(file.buffer, FOLDER))
  );
  const uploadedImages = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);
  const uploadErrors = results
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason);

  if (uploadErrors.length) {
    try {
      await deleteImages(uploadedImages.map((image) => image.publicId));
    } catch (cleanupError) {
      throw new AggregateError(
        [...uploadErrors, cleanupError],
        'No se pudieron subir ni limpiar todas las imágenes'
      );
    }

    if (uploadErrors.length === 1) throw uploadErrors[0];
    throw new AggregateError(uploadErrors, 'No se pudieron subir todas las imágenes');
  }

  return uploadedImages;
}

async function uploadAvatar(file) {
  return uploadBuffer(file.buffer, AVATAR_FOLDER);
}

/**
 * Borra una imagen de Cloudinary por su publicId.
 * Útil cuando se elimina una incidencia o se reemplaza una imagen.
 */
async function deleteImage(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
}

/**
 * Borra varias imágenes en paralelo (por ejemplo al borrar una incidencia entera).
 */
async function deleteImages(publicIds = []) {
  await Promise.all(publicIds.map((id) => deleteImage(id)));
}

export default {
  uploadIncidentImages,
  uploadAvatar,
  deleteImage,
  deleteImages,
};