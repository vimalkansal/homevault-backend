import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AIService } from '../services/ai.service';
import prisma from '../config/database';
import fs from 'fs';

export class AIController {
  private aiService: AIService | null;

  constructor() {
    try {
      this.aiService = new AIService();
    } catch (error) {
      console.warn('AI Service not available:', error);
      this.aiService = null;
    }
  }

  analyzeImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!this.aiService) {
        return res.status(503).json({
          success: false,
          message: 'AI service is not configured. Please set OPENAI_API_KEY in environment variables.',
        });
      }

      const file = req.file as Express.Multer.File;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
        });
      }

      // Analyze the image
      const identification = await this.aiService.identifyItemFromImage(file.path);

      // Clean up the temporary file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      res.json({
        success: true,
        data: identification,
      });
    } catch (error) {
      console.error('Error analyzing image:', error);

      // Clean up file on error
      const file = req.file as Express.Multer.File;
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      next(error);
    }
  };

  semanticSearch = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!this.aiService) {
        return res.status(503).json({
          success: false,
          message: 'AI service is not configured. Please set OPENAI_API_KEY in environment variables.',
        });
      }

      const { query } = req.body;
      const userId = req.user!.id;

      console.log('🔍 AI Semantic Search Request:', { query, userId });

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      // Fetch all user's items
      const allItems = await prisma.item.findMany({
        where: { createdById: userId },
        include: {
          photos: true,
          tags: {
            include: {
              category: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      console.log(`📦 Found ${allItems.length} items for user`);
      console.log('📍 Item locations:', allItems.map(i => ({ name: i.name, location: i.location })));

      // Use AI to rank items by semantic location match
      const rankedItems = await this.aiService.semanticLocationSearch(query, allItems);

      console.log(`✅ AI returned ${rankedItems.length} matching items`);

      res.json({
        success: true,
        data: rankedItems,
        total: rankedItems.length,
      });
    } catch (error) {
      console.error('❌ Error in semantic search:', error);
      next(error);
    }
  };
}
