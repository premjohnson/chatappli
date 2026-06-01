import multer from 'multer';

const storage = multer.memoryStorage();


const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg'
];


const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, WEBP allowed.'), false);
  }
  cb(null, true);
};


const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter
});


export const uploadAvatar = upload.single('avatar');