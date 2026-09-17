/**
 * 404 para cualquier ruta que no haya encontrado
 * ningún router.
 */
export function notFound(req, res, next) {
  res.status(404).json({
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
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
  console.error(err);

  // Errores de negocio
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  // Errores de validación de Mongoose
  if (err.name === 'ValidationError') {
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
      message: `Valor inválido para ${err.path}: ${err.value}`,
    });
  }

  // Índice único
  if (err.code === 11000) {
    const field = Object.keys(
      err.keyValue || {}
    )[0];

    return res.status(409).json({
      message: `Ya existe un registro con ese ${field}`,
    });
  }

  // Error genérico
  const isDev =
    process.env.NODE_ENV !== 'production';

  return res.status(500).json({
    message: 'Error interno del servidor',

    ...(isDev && {
      stack: err.stack,
    }),
  });
}