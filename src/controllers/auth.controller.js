import { StatusCodes } from 'http-status-codes';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { createSendToken } from '../middleware/auth.middleware.js';

export const register = catchAsync(async (req, res, next) => {
  const { name, username, email, password, institution, level, course } = req.body;

  const user = await User.create({
    name,
    username,
    email,
    password,
    institution,
    level,
    course
  });

  createSendToken(user, StatusCodes.CREATED, res);
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) return next(new AppError('Please provide email and password', 400));

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  if (!user.isActive) return next(new AppError('Account is inactive', 403));

  createSendToken(user, StatusCodes.OK, res);
});

export const me = catchAsync(async (req, res) => {
  res.status(StatusCodes.OK).json({
    status: 'success',
    data: { user: req.user }
  });
});

export const updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) return next(new AppError('currentPassword and newPassword are required', 400));

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }
  user.password = newPassword;
  await user.save();

  createSendToken(user, StatusCodes.OK, res);
});
