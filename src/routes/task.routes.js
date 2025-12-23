import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/multer.js';
import {
  listMyTasks,
  createTask,
  getTask,
  updateTask,
  markDone,
  deleteTask,
  deleteAttachment
} from '../controllers/task.controller.js';

const router = Router();

router.use(protect);

router
  .route('/')
  .get(listMyTasks)
  .post(upload.array('attachments', 10), createTask);

router
  .route('/:id')
  .get(getTask)
  .patch(upload.array('attachments', 10), updateTask)
  .delete(deleteTask);

router.patch('/:id/done', markDone);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

export default router;
