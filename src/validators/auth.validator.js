import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  username: Joi.string().min(2).max(40).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  institution: Joi.string().allow('', null).optional(),
  level: Joi.string().allow('', null).optional(),
  course: Joi.string().allow('', null).optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional()
});

export const requestOtpSchema = Joi.object({
  email: Joi.string().email().required()
});

export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required()
});
