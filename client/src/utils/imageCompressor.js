import imageCompression from 'browser-image-compression';

const defaultOptions = {
  maxSizeMB: 0.8,          // Max 800KB
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  preserveExif: true,
  fileType: 'image/jpeg',
};

/**
 * Compress an image file before upload.
 * @param {File} file - The image file to compress
 * @param {Function} onProgress - Optional progress callback (0-100)
 * @returns {Promise<File>} - Compressed file
 */
export const compressImage = async (file, onProgress) => {
  try {
    const options = {
      ...defaultOptions,
      onProgress: onProgress || undefined,
    };

    const compressedFile = await imageCompression(file, options);

    console.log(
      `[IMAGE_COMPRESSED] original=${(file.size / 1024).toFixed(0)}KB compressed=${(compressedFile.size / 1024).toFixed(0)}KB ratio=${((1 - compressedFile.size / file.size) * 100).toFixed(0)}%`
    );

    return compressedFile;
  } catch (error) {
    console.error('[IMAGE_COMPRESSION_FAILED]', error);
    // Return original file if compression fails
    return file;
  }
};
