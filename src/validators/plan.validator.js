import Joi from 'joi';

export const planCreateSchema = Joi.object({
  name: Joi.string().min(2).max(40).required(),
  priceMonth: Joi.number().min(0).optional(),
  priceYear: Joi.number().min(0).optional(),
  taskLimitYear: Joi.number().min(1).required()
});
