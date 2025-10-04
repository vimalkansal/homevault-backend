import { Response, NextFunction } from 'express';
import { AuthRequest, UpdatePhotoDTO } from '../types';
import prisma from '../config/database';
import fs from 'fs';
import path from 'path';

export class PhotoController {
  async uploadPhotos(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // item id
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      // Check if item exists
      const item = await prisma.item.findUnique({ where: { id } });

      if (!item) {
        // Clean up uploaded files
        files.forEach(file => fs.unlinkSync(file.path));

        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }

      // Get current photo count
      const photoCount = await prisma.photo.count({ where: { itemId: id } });

      // Check max photos limit
      const maxFiles = parseInt(process.env.MAX_FILES || '5');
      if (photoCount + files.length > maxFiles) {
        // Clean up uploaded files
        files.forEach(file => fs.unlinkSync(file.path));

        return res.status(400).json({
          success: false,
          message: `Maximum ${maxFiles} photos allowed per item`
        });
      }

      // Create photo records
      const photos = await Promise.all(
        files.map((file, index) =>
          prisma.photo.create({
            data: {
              itemId: id,
              filePath: file.path,
              fileSize: file.size,
              displayOrder: photoCount + index
            }
          })
        )
      );

      res.status(201).json({
        success: true,
        data: photos
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // photo id
      const { annotations, displayOrder }: UpdatePhotoDTO = req.body;

      const photo = await prisma.photo.update({
        where: { id },
        data: {
          ...(annotations !== undefined && { annotations }),
          ...(displayOrder !== undefined && { displayOrder })
        }
      });

      res.json({
        success: true,
        data: photo
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // photo id

      const photo = await prisma.photo.findUnique({ where: { id } });

      if (!photo) {
        return res.status(404).json({
          success: false,
          message: 'Photo not found'
        });
      }

      // Delete file from filesystem
      if (fs.existsSync(photo.filePath)) {
        fs.unlinkSync(photo.filePath);
      }

      // Delete from database
      await prisma.photo.delete({ where: { id } });

      res.json({
        success: true,
        message: 'Photo deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getPhotoFile(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // photo id

      const photo = await prisma.photo.findUnique({ where: { id } });

      if (!photo) {
        return res.status(404).json({
          success: false,
          message: 'Photo not found'
        });
      }

      if (!fs.existsSync(photo.filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Photo file not found'
        });
      }

      res.sendFile(path.resolve(photo.filePath));
    } catch (error) {
      next(error);
    }
  }
}
