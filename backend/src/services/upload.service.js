import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER = 'incidents';

/**
 * Sube un único buffer (el que llega de multer en memoria) a Cloudinary
 * usando un stream, sin escribir nada a disco.
 */
function uploadBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER,
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

  const uploads = files.map((file) => uploadBuffer(file.buffer));
  return Promise.all(uploads);
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
  deleteImage,
  deleteImages,
};