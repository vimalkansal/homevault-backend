import { Response, NextFunction } from 'express';
import { AuthRequest, CreateItemDTO, UpdateItemDTO, ItemSearchQuery } from '../types';
import prisma from '../config/database';

export class ItemController {
  async createItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, location, categories }: CreateItemDTO = req.body;
      const userId = req.user!.id;

      // Create item
      const item = await prisma.item.create({
        data: {
          name,
          description,
          location,
          createdById: userId
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          photos: true,
          tags: {
            include: {
              category: true
            }
          }
        }
      });

      // Add categories if provided
      if (categories && categories.length > 0) {
        for (const categoryName of categories) {
          // Find or create category
          let category = await prisma.category.findUnique({
            where: { name: categoryName }
          });

          if (!category) {
            category = await prisma.category.create({
              data: {
                name: categoryName,
                type: 'custom',
                createdById: userId
              }
            });
          }

          // Link category to item
          await prisma.itemTag.create({
            data: {
              itemId: item.id,
              categoryId: category.id
            }
          });
        }
      }

      // Create history entry
      await prisma.itemHistory.create({
        data: {
          itemId: item.id,
          userId,
          action: 'created',
          newValue: JSON.stringify({ name, location })
        }
      });

      // Fetch updated item with categories
      const updatedItem = await prisma.item.findUnique({
        where: { id: item.id },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          photos: true,
          tags: {
            include: {
              category: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: updatedItem
      });
    } catch (error) {
      next(error);
    }
  }

  async getItems(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        search,
        category,
        createdBy,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      }: ItemSearchQuery = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (category) {
        where.tags = {
          some: {
            category: {
              name: category
            }
          }
        };
      }

      if (createdBy) {
        where.createdById = createdBy;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      // Get items
      const [items, total] = await Promise.all([
        prisma.item.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { [sortBy]: sortOrder },
          include: {
            createdBy: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            photos: {
              take: 1,
              orderBy: { displayOrder: 'asc' }
            },
            tags: {
              include: {
                category: true
              }
            }
          }
        }),
        prisma.item.count({ where })
      ]);

      res.json({
        success: true,
        data: items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getItemById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const item = await prisma.item.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          photos: {
            orderBy: { displayOrder: 'asc' }
          },
          tags: {
            include: {
              category: true
            }
          }
        }
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, location, categories }: UpdateItemDTO = req.body;
      const userId = req.user!.id;

      // Check if item exists
      const existingItem = await prisma.item.findUnique({ where: { id } });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }

      // Update item
      const item = await prisma.item.update({
        where: { id },
        data: {
          name,
          description,
          location
        }
      });

      // Update categories if provided
      if (categories !== undefined) {
        // Remove existing tags
        await prisma.itemTag.deleteMany({
          where: { itemId: id }
        });

        // Add new categories
        for (const categoryName of categories) {
          let category = await prisma.category.findUnique({
            where: { name: categoryName }
          });

          if (!category) {
            category = await prisma.category.create({
              data: {
                name: categoryName,
                type: 'custom',
                createdById: userId
              }
            });
          }

          await prisma.itemTag.create({
            data: {
              itemId: id,
              categoryId: category.id
            }
          });
        }
      }

      // Create history entries for changed fields
      if (name && name !== existingItem.name) {
        await prisma.itemHistory.create({
          data: {
            itemId: id,
            userId,
            action: 'updated',
            fieldChanged: 'name',
            oldValue: existingItem.name,
            newValue: name
          }
        });
      }

      if (location && location !== existingItem.location) {
        await prisma.itemHistory.create({
          data: {
            itemId: id,
            userId,
            action: 'updated',
            fieldChanged: 'location',
            oldValue: existingItem.location,
            newValue: location
          }
        });
      }

      // Fetch updated item
      const updatedItem = await prisma.item.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          photos: true,
          tags: {
            include: {
              category: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: updatedItem
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const item = await prisma.item.findUnique({ where: { id } });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }

      await prisma.item.delete({ where: { id } });

      res.json({
        success: true,
        message: 'Item deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getItemHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const history = await prisma.itemHistory.findMany({
        where: { itemId: id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }
}
