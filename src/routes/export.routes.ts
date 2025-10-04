import { Router } from 'express';
import { ExportController } from '../controllers/export.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const exportController = new ExportController();

router.use(authenticate); // All export routes require authentication

router.get('/items/csv', exportController.exportCSV);
router.get('/items/json', exportController.exportJSON);

export default router;
