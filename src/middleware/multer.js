import multer from 'multer';
import AppError from '../utils/AppError.js';

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  // allow images + common docs; you can tighten this as needed
  const allowed = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  if (!allowed.includes(file.mimetype)) {
    return cb(new AppError(`Unsupported file type: ${file.mimetype}`, 415));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});
