import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { UserService } from '../services/user.service';

const userService = new UserService();

export class UserController {
  /**
   * Get current user profile
   */
  getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const profile = await userService.getUserProfile(userId);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user profile
   */
  updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { fullName } = req.body;

      const profile = await userService.updateProfile(userId, { fullName });

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload avatar
   */
  uploadAvatar = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      const avatarUrl = await userService.uploadAvatar(userId, file);

      res.json({
        success: true,
        data: { avatarUrl },
        message: 'Avatar uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      next(error);
    }
  };

  /**
   * Delete avatar
   */
  deleteAvatar = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      await userService.deleteAvatar(userId);

      res.json({
        success: true,
        message: 'Avatar deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user avatar by user ID (for viewing other users' avatars)
   */
  getUserAvatar = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const user = await userService.getUserProfile(userId);

      if (!user.avatarUrl) {
        return res.status(404).json({
          success: false,
          message: 'User has no avatar'
        });
      }

      res.json({
        success: true,
        data: { avatarUrl: user.avatarUrl }
      });
    } catch (error) {
      next(error);
    }
  };
}
