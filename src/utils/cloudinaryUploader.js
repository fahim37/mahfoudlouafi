import cloudinary from '../config/cloudinary.js';
import { initCloudinary } from '../config/cloudinary.js';

initCloudinary();

/**
 * Upload a buffer to Cloudinary using upload_stream
 * @param {Buffer} buffer
 * @param {Object} options { folder, resource_type, public_id }
 * @returns {Promise<{url, publicId, resourceType, bytes}>}
 */
export function uploadBuffer(buffer, options = {}) {
  const folder = options.folder || process.env.CLOUDINARY_FOLDER || 'tully';
  const resource_type = options.resource_type || 'auto';

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          bytes: result.bytes
        });
      }
    );

    stream.end(buffer);
  });
}

/**
 * Delete an asset from Cloudinary
 * @param {string} publicId
 * @param {string} resourceType image|video|raw
 */
export async function deleteAsset(publicId, resourceType = 'image') {
  if (!publicId) return { result: 'skipped' };
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
