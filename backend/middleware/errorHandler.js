const errorHandler = (err, req, res, next) => {
  const uploadError = err.code === 'LIMIT_FILE_SIZE'
    ? 'Image size must be 5 MB or less.'
    : (err.message?.startsWith('Only JPG, PNG, and WEBP') ? err.message : null);
  const statusCode = uploadError ? 400 : (err.statusCode || 500);
  const message = uploadError || (err.isOperational ? err.message : 'An unexpected error occurred. Please try again.');

  if (req.originalUrl.startsWith('/api/ai')) {
    console.error(`[StayBot] ${req.method} ${req.path} failed (${statusCode})`, err.code || err.name || 'Error');
  } else {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
