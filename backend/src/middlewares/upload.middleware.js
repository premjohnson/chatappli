import multer from 'multer';

/**
 * Memory storage (no disk writes)
 */
const storage = multer.memoryStorage();

/**
 * Allowed MIME types
 */
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg'
];

/**
 * File filter
 */
const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, WEBP allowed.'), false);
  }
  cb(null, true);
};

/**
 * Multer instance
 */
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter
});

/**
 * Single avatar upload
 */
export const uploadAvatar = upload.single('avatar');