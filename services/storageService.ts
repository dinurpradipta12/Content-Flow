import { supabase } from './supabaseClient';

/**
 * Supabase Storage Service
 * Handles uploading files to Supabase Storage buckets and returning public URLs.
 */
export const storageService = {
    /**
     * Upload a file to a Supabase bucket
     * @param file The file object to upload
     * @param bucket The name of the bucket (e.g., 'content-assets')
     * @param folder Optional folder path within the bucket
     * @returns The public URL of the uploaded file
     */
    async uploadFile(file: File, bucket: string, folder: string = 'uploads'): Promise<string | null> {
        try {
            // 1. Ensure bucket exists or handled by your Supabase setup
            // 2. Generate unique filename to avoid collisions
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = folder ? `${folder}/${fileName}` : fileName;

            // 3. Perform upload
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error(`[Storage] Upload error:`, error.message);
                throw error;
            }

            // 4. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            console.log(`[Storage] File uploaded successfully:`, publicUrl);
            return publicUrl;
        } catch (error) {
            console.error(`[Storage] Failed to upload file:`, error);
            return null;
        }
    },

    /**
     * Delete a file from a Supabase bucket
     * @param bucket The name of the bucket
     * @param filePath The full path of the file to delete (e.g., 'uploads/image.png')
     */
    async deleteFile(bucket: string, filePath: string): Promise<boolean> {
        try {
            const { error } = await supabase.storage
                .from(bucket)
                .remove([filePath]);

            if (error) {
                console.error(`[Storage] Delete error:`, error.message);
                return false;
            }

            return true;
        } catch (error) {
            console.error(`[Storage] Failed to delete file:`, error);
            return false;
        }
    }
};
