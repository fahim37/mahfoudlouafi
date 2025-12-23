import AppError from '../utils/AppError.js';

function sendErrorDev(err, res) {
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    message: err.message,
    error: err,
    stack: err.stack
  });
}

function sendErrorProd(err, res) {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong'
    });
  }
}

// Handle common mongo errors a bit nicer
function handleCastErrorDB(err) {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
}
function handleDuplicateFieldsDB(err) {
  const keys = Object.keys(err.keyValue || {});
  const field = keys[0] || 'field';
  return new AppError(`Duplicate value for ${field}. Please use another value.`, 409);
}
function handleValidationErrorDB(err) {
  const messages = Object.values(err.errors || {}).map((e) => e.message);
  return new AppError(messages.join('. '), 400);
}
function handleJWTError() {
  return new AppError('Invalid token. Please log in again.', 401);
}
function handleJWTExpiredError() {
  return new AppError('Your token has expired. Please log in again.', 401);
}

export default function globalErrorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const env = process.env.NODE_ENV || 'development';

  if (env === 'development') return sendErrorDev(err, res);

  let error = err;

  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  return sendErrorProd(error, res);
}
