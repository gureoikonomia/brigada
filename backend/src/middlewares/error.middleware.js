/**
 * 404 para cualquier ruta que no haya encontrado
 * ningún router.
 */
export function notFound(req, res, next) {
  res.status(404).json({
    message: 'Ruta no encontrada',
  });
}

/**
 * Middleware global de errores.
 */
export function errorHandler(
  err,
  req,
  res,
  next
) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Request failed:', err.name || 'Error');
  } else {
    console.error(err);
  }

  // Errores de negocio
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  // Errores de validación de Mongoose
  if (err.name === 'ValidationError') {
    if (process.env.NODE_ENV === 'production') {
      return res.status(400).json({ message: 'Datos no válidos' });
    }

    const messages = Object.values(
      err.errors
    ).map((error) => error.message);

    return res.status(400).json({
      message: messages.join('. '),
    });
  }

  // ObjectId inválido
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: process.env.NODE_ENV === 'production'
        ? 'Identificador no válido'
        : `Valor inválido para ${err.path}: ${err.value}`,
    });
  }

  // Índice único
  if (err.code === 11000) {
    return res.status(409).json({
      message: process.env.NODE_ENV === 'production'
        ? 'No se pudo completar la operación'
        : `Ya existe un registro con ese ${Object.keys(err.keyValue || {})[0]}`,
    });
  }

  // Error genérico
  return res.status(500).json({
    message: 'Error interno del servidor',
  });
}