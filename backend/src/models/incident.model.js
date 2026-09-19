import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
      maxlength: 3000,
    },
    category: {
      type: String,
      enum: ['infraestructura', 'seguridad', 'limpieza', 'ruido', 'trafico', 'otros'],
      default: 'otros',
    },
    status: {
      type: String,
      enum: ['pendiente', 'en_revision', 'resuelta', 'rechazada'],
      default: 'en_revision',
      index: true,
    },
    // Ubicación en formato GeoJSON -> permite queries geoespaciales ($near, etc.)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitud, latitud]
        required: true,
      },
      address: {
        type: String,
        trim: true,
        default: null,
      },
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: null }, // útil si usáis Cloudinary/S3 con key propia
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Contador desnormalizado para no agregar la colección Vote en cada listado.
    // Se actualiza atómicamente desde vote.service.js al crear/eliminar un voto.
    votesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Índice geoespacial para buscar incidencias cercanas a un punto
incidentSchema.index({ location: '2dsphere' });

// Índice compuesto útil para listar por estado ordenando por popularidad/fecha
incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ status: 1, votesCount: -1 });

export default mongoose.model('Incident', incidentSchema);