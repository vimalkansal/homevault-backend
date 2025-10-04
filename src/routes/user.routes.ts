import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { avatarUpload } from '../config/avatarUpload';

const router = Router();
const userController = new UserController();

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Avatar routes
router.post('/avatar', avatarUpload.single('avatar'), userController.uploadAvatar);
router.delete('/avatar', userController.deleteAvatar);
router.get('/avatar/:userId', userController.getUserAvatar);

export default router;
