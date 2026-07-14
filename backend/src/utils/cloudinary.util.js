import { v2 as cloudinary } from 'cloudinary';
import config from '../config/index.js';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

export const uploadImageBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'mychat/avatars' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
};

export const deleteImage = async (publicId) => {
  await cloudinary.uploader.destroy(publicId);
};

export const uploadChatFileBuffer = (buffer, fileName, mimeType) => {
  return new Promise((resolve, reject) => {
    let resource_type = 'auto';
    
    if (mimeType && !mimeType.startsWith('image/') && !mimeType.startsWith('video/') && !mimeType.startsWith('audio/')) {
      resource_type = 'raw';
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'mychat/media',
        resource_type,
        public_id: fileName ? `${Date.now()}-${fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_")}` : undefined
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
};