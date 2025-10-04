import prisma from '../config/database';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export class UserService {
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: { fullName?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return user;
  }

  /**
   * Upload and process avatar image
   */
  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    try {
      // Ensure upload directory exists
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const avatarDir = path.join(uploadDir, 'avatars', userId);

      if (!fs.existsSync(avatarDir)) {
        fs.mkdirSync(avatarDir, { recursive: true });
      }

      // Generate filename
      const filename = `avatar-${Date.now()}.webp`;
      const avatarPath = path.join(avatarDir, filename);

      // Process image with Sharp (resize and optimize)
      await sharp(file.path)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 90 })
        .toFile(avatarPath);

      // Delete old avatar if exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true }
      });

      if (user?.avatarUrl) {
        const oldAvatarPath = path.join(uploadDir, user.avatarUrl);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      // Clean up temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      // Update user record with new avatar URL
      const avatarUrl = `avatars/${userId}/${filename}`;
      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl }
      });

      return avatarUrl;
    } catch (error) {
      // Clean up temp file on error
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true }
    });

    if (user?.avatarUrl) {
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const avatarPath = path.join(uploadDir, user.avatarUrl);

      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }

      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: null }
      });
    }
  }
}
