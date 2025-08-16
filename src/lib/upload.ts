import { supabase } from './supabase';

export class UploadService {
  
  /**
   * Upload a file to Supabase storage
   */
  static async uploadFile(
    file: File, 
    bucket: string, 
    folder: string = '', 
    fileName?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Generate unique filename if not provided
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = fileName || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const filePath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

      // Upload file to Supabase storage
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return { success: true, url: publicUrl };

    } catch (error) {
      console.error('Upload service error:', error);
      return { success: false, error: 'Failed to upload file' };
    }
  }

  /**
   * Upload admin CV
   */
  static async uploadAdminCV(file: File, adminId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    return this.uploadFile(file, 'admin-cvs', 'cvs', `${adminId}-cv`);
  }

  /**
   * Upload admin profile picture
   */
  static async uploadAdminPicture(file: File, adminId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    return this.uploadFile(file, 'admin-pictures', 'profiles', `${adminId}-profile`);
  }

  /**
   * Upload worker profile picture
   */
  static async uploadWorkerPicture(file: File, workerId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    return this.uploadFile(file, 'worker-pictures', 'profiles', `${workerId}-profile`);
  }

  /**
   * Delete a file from Supabase storage
   */
  static async deleteFile(bucket: string, filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      console.error('Delete service error:', error);
      return { success: false, error: 'Failed to delete file' };
    }
  }
}


