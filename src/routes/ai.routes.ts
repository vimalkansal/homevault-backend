import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/upload';

const router = Router();
const aiController = new AIController();

// Analyze image to identify item
router.post('/analyze-image', authenticate, upload.single('image'), aiController.analyzeImage);

// Semantic location search
router.post('/search', authenticate, aiController.semanticSearch);

export default router;
