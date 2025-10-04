import { Response, NextFunction } from 'express';
import { AuthRequest, CreateCategoryDTO } from '../types';
import prisma from '../config/database';

export class CategoryController {
  async getCategories(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }

  async getPredefinedCategories(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.category.findMany({
        where: { type: 'predefined' },
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name }: CreateCategoryDTO = req.body;
      const userId = req.user!.id;

      // Check if category already exists
      const existing = await prisma.category.findUnique({ where: { name } });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Category already exists'
        });
      }

      const category = await prisma.category.create({
        data: {
          name,
          type: 'custom',
          createdById: userId
        }
      });

      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name }: CreateCategoryDTO = req.body;

      const category = await prisma.category.findUnique({ where: { id } });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      if (category.type === 'predefined') {
        return res.status(403).json({
          success: false,
          message: 'Cannot update predefined categories'
        });
      }

      const updated = await prisma.category.update({
        where: { id },
        data: { name }
      });

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({ where: { id } });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      if (category.type === 'predefined') {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete predefined categories'
        });
      }

      await prisma.category.delete({ where: { id } });

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
