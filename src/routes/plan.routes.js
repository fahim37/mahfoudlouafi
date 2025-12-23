import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { planCreateSchema } from '../validators/plan.validator.js';
import { createPlan, listPlans, updatePlan, deletePlan } from '../controllers/plan.controller.js';

const router = Router();

router.get('/', listPlans);

router.use(protect);
router.use(restrictTo('admin'));

router.post('/', validate(planCreateSchema), createPlan);
router.patch('/:id', updatePlan);
router.delete('/:id', deletePlan);

export default router;
