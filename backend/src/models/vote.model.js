import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Por si en el futuro queréis votos positivos/negativos en vez de solo "apoyo"
    value: {
      type: Number,
      enum: [1, -1],
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// CLAVE: índice único compuesto -> un usuario solo puede tener 1 voto por incidencia.
// Si se intenta insertar un duplicado, MongoDB lanza error de clave duplicada (código 11000),
// que hay que capturar en vote.service.js y devolver como 409 Conflict.
voteSchema.index({ incident: 1, user: 1 }, { unique: true });

export default mongoose.model('Vote', voteSchema);