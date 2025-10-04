import { Router } from 'express';
import { PhotoController } from '../controllers/photo.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/upload';

const router = Router();
const photoController = new PhotoController();

// Public route for viewing photos (no auth required for img tags to work)
router.get('/:id/file', photoController.getPhotoFile);

// Protected routes
router.put('/:id', authenticate, photoController.updatePhoto);
router.delete('/:id', authenticate, photoController.deletePhoto);

export default router;
