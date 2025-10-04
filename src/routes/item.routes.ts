import { Router } from 'express';
import { ItemController } from '../controllers/item.controller';
import { PhotoController } from '../controllers/photo.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/upload';

const router = Router();
const itemController = new ItemController();
const photoController = new PhotoController();

router.use(authenticate); // All item routes require authentication

router.get('/', itemController.getItems);
router.post('/', itemController.createItem);
router.post('/quick', itemController.createItem); // Same as create, just different endpoint
router.get('/:id', itemController.getItemById);
router.put('/:id', itemController.updateItem);
router.delete('/:id', itemController.deleteItem);
router.get('/:id/history', itemController.getItemHistory);

// Photo management for items
router.post('/:id/photos', upload.array('photos', 5), photoController.uploadPhotos);
router.get('/:id/photos', itemController.getItemById); // Photos are included in item details

export default router;
