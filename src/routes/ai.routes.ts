import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';

const router = Router();
const aiController = new AIController();

// Simple upload configuration for AI analysis (uses system temp directory)
const tempUploadDir = path.join(os.tmpdir(), 'homevault-ai');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const aiUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, tempUploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `ai-analysis-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
  limits: {
    fileSize: 10485760 // 10MB
  }
});

// Analyze image to identify item
router.post('/analyze-image', authenticate, aiUpload.single('image'), aiController.analyzeImage);

// Semantic location search
router.post('/search', authenticate, aiController.semanticSearch);

export default router;
