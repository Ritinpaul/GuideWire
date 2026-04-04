/**
 * Zod-based request body validation middleware.
 * Usage:  router.post('/route', validateBody(MySchema), handler)
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field:   e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req.body = result.data; // replace with coerced/defaulted values
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: result.error.errors.map((e) => ({
          field:   e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req.query = result.data;
    next();
  };
}
