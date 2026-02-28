// services/cloudinaryService.ts

declare global {
  interface ImportMetaEnv {
    VITE_CLOUDINARY_CLOUD_NAME: string;
    VITE_CLOUDINARY_UPLOAD_PRESET: string;
    VITE_CLOUDINARY_API_KEY?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

/**
 * Upload file ke Cloudinary
 * @param file File yang akan diupload
 * @param folder Folder di Cloudinary (default: 'aruneeka-icons')
 * @returns URL cloudinary yang di-upload
 */
export const uploadToCloudinary = async (
  file: File,
  folder: string = 'aruneeka-icons'
): Promise<string> => {
  try {
    // Validasi file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File terlalu besar (max 5MB)');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('File harus berupa gambar (PNG, JPG, SVG)');
    }

    const formData = new FormData();
    formData.append('file', file);
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned';
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);
    formData.append('public_id', `${folder}/${Date.now()}-${file.name}`);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      throw new Error('VITE_CLOUDINARY_CLOUD_NAME tidak ditemukan di .env');
    }

    // Upload ke Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload gagal');
    }

    const data = await response.json();
    
    // Return secure URL (HTTPS)
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Delete file dari Cloudinary (optional)
 */
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;

    if (!cloudName || !apiKey) {
      console.warn('Cloudinary credentials tidak lengkap untuk delete');
      return false;
    }

    // Note: Delete memerlukan server-side authentication
    // Client-side tidak bisa delete (security risk)
    // Ini hanya untuk reference
    console.log(`Untuk delete, hubungi API server dengan public_id: ${publicId}`);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};
