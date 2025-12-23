import Joi from 'joi';

export const updateMeSchema = Joi.object({
  name: Joi.string().min(2).max(80).optional(),
  username: Joi.string().min(2).max(40).optional(),
  institution: Joi.string().allow('', null).optional(),
  level: Joi.string().allow('', null).optional(),
  course: Joi.string().allow('', null).optional()
});
