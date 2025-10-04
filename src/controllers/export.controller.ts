import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';

export class ExportController {
  async exportCSV(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = await prisma.item.findMany({
        include: {
          createdBy: {
            select: {
              fullName: true
            }
          },
          tags: {
            include: {
              category: true
            }
          }
        }
      });

      // Build CSV
      const headers = ['ID', 'Name', 'Description', 'Location', 'Categories', 'Created By', 'Created At'];
      const rows = items.map(item => [
        item.id,
        item.name,
        item.description || '',
        item.location,
        item.tags.map(t => t.category.name).join('; '),
        item.createdBy?.fullName || '',
        item.createdAt.toISOString()
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=items-export.csv');
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }

  async exportJSON(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = await prisma.item.findMany({
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

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=items-export.json');
      res.json({
        exportDate: new Date().toISOString(),
        itemCount: items.length,
        items
      });
    } catch (error) {
      next(error);
    }
  }
}
