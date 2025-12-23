import AppError from '../utils/AppError.js';

export const validate = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });
  if (error) {
    const msg = error.details.map((d) => d.message).join(', ');
    return next(new AppError(msg, 400));
  }
  req[property] = value;
  next();
};
