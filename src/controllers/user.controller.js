import { StatusCodes } from 'http-status-codes';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { uploadBuffer, deleteAsset } from '../utils/cloudinaryUploader.js';

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) newObj[key] = obj[key];
  });
  return newObj;
};

export const updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password) return next(new AppError('Use /auth/update-password to change password', 400));

  const filteredBody = filterObj(
    req.body,
    'name',
    'username',
    'institution',
    'level',
    'course'
  );

  const user = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(StatusCodes.OK).json({
    status: 'success',
    data: { user }
  });
});

export const uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('avatar file is required', 400));

  const user = await User.findById(req.user._id);
  if (!user) return next(new AppError('User not found', 404));

  // upload new
  const uploaded = await uploadBuffer(req.file.buffer, {
    folder: `${process.env.CLOUDINARY_FOLDER || 'tully'}/avatars`,
    resource_type: 'image'
  });

  // delete old
  if (user.avatar?.publicId) {
    await deleteAsset(user.avatar.publicId, 'image');
  }

  user.avatar = { url: uploaded.url, publicId: uploaded.publicId };
  await user.save();

  res.status(StatusCodes.OK).json({
    status: 'success',
    data: { avatar: user.avatar }
  });
});
