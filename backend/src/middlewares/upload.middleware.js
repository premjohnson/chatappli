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

const chatUpload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname && file.originalname.match(/\.(exe|bat|cmd|sh|msi|vbs|js|ts|com|scr|pif)$/i)) {
      return cb(new Error('Executable and script files are not allowed for security reasons.'), false);
    }
    cb(null, true);
  }
});

export const uploadChatFileSingle = chatUpload.single('file');