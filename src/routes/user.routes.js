import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/multer.js';
import { updateMe, uploadAvatar } from '../controllers/user.controller.js';
import { updateMeSchema } from '../validators/user.validator.js';

const router = Router();

router.patch('/me', protect, validate(updateMeSchema), updateMe);
router.post('/me/avatar', protect, upload.single('avatar'), uploadAvatar);

export default router;
