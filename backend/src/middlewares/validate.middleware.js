export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const messages = result.error.issues.map(
        (issue) => `${issue.path.join('.') || source}: ${issue.message}`
      );

      return res.status(400).json({
        message: messages.join('. '),
      });
    }

    req.validated ??= {};
    req.validated[source] = result.data;

    return next();
  };
}