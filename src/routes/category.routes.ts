import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const categoryController = new CategoryController();

router.use(authenticate); // All category routes require authentication

router.get('/', categoryController.getCategories);
router.get('/predefined', categoryController.getPredefinedCategories);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
