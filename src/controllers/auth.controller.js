import { StatusCodes } from 'http-status-codes';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import {
  sendAuthTokens,
  extractRefreshToken,
  verifyRefreshJwt,
  hashToken,
  clearRefreshTokenCookie
} from '../middleware/auth.middleware.js';
import { sendEmail, buildOtpEmail } from '../utils/email.js';

const parsedOtpExpiry = Number(process.env.OTP_EXPIRY_MINUTES);
const parsedOtpAttempts = Number(process.env.OTP_MAX_ATTEMPTS);
const OTP_EXPIRY_MINUTES = Number.isFinite(parsedOtpExpiry) ? parsedOtpExpiry : 10;
const OTP_MAX_ATTEMPTS = Number.isFinite(parsedOtpAttempts) ? parsedOtpAttempts : 5;

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

  await sendAuthTokens(user, StatusCodes.CREATED, res);
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) return next(new AppError('Please provide email and password', 400));

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  if (!user.isActive) return next(new AppError('Account is inactive', 403));

  await sendAuthTokens(user, StatusCodes.OK, res);
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

  await sendAuthTokens(user, StatusCodes.OK, res);
});

export const refreshTokens = catchAsync(async (req, res, next) => {
  const incomingToken = extractRefreshToken(req);
  if (!incomingToken) return next(new AppError('Refresh token is missing', StatusCodes.UNAUTHORIZED));

  let payload;
  try {
    payload = verifyRefreshJwt(incomingToken);
  } catch (err) {
    return next(new AppError('Invalid refresh token', StatusCodes.UNAUTHORIZED));
  }

  const user = await User.findById(payload.id).select('+refreshTokenId +refreshTokenExpiresAt');
  if (!user) return next(new AppError('The user belonging to this token no longer exists', 401));
  if (!user.isActive) return next(new AppError('Account is inactive', 403));
  if (!user.refreshTokenId || !user.refreshTokenExpiresAt) {
    return next(new AppError('Refresh token has been revoked', StatusCodes.UNAUTHORIZED));
  }
  if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
    return next(new AppError('Refresh token expired', StatusCodes.UNAUTHORIZED));
  }
  if (payload.tokenId && hashToken(payload.tokenId) !== user.refreshTokenId) {
    return next(new AppError('Refresh token has been rotated. Please log in again.', StatusCodes.UNAUTHORIZED));
  }
  if (user.changedPasswordAfter(payload.iat)) {
    return next(new AppError('Password recently changed. Please log in again.', 401));
  }

  await sendAuthTokens(user, StatusCodes.OK, res);
});

export const logout = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { refreshTokenId: undefined, refreshTokenExpiresAt: undefined },
    { validateBeforeSave: false }
  );

  clearRefreshTokenCookie(res);

  res.status(StatusCodes.OK).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

export const requestOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return next(new AppError('No user found with that email', 404));

  const code = String(Math.floor(100000 + Math.random() * 900000));
  user.otpCodeHash = hashToken(code);
  user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  user.otpAttempts = 0;
  await user.save({ validateBeforeSave: false });

  const { subject, html, text } = buildOtpEmail(code, OTP_EXPIRY_MINUTES);
  await sendEmail({ to: email, subject, html, text });

  res.status(StatusCodes.OK).json({
    status: 'success',
    message: 'OTP sent to your email'
  });
});

export const verifyOtp = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email }).select('+otpCodeHash +otpExpiresAt +otpAttempts');
  if (!user) return next(new AppError('No user found with that email', 404));

  if (!user.otpCodeHash || !user.otpExpiresAt) {
    return next(new AppError('No OTP request pending for this user', 400));
  }
  if (user.otpExpiresAt.getTime() < Date.now()) {
    return next(new AppError('OTP has expired. Please request a new one.', 400));
  }
  if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    return next(new AppError('Too many invalid attempts. Please request a new OTP.', 429));
  }

  const incomingHash = hashToken(code);
  if (incomingHash !== user.otpCodeHash) {
    user.otpAttempts += 1;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Invalid OTP code', 400));
  }

  user.otpCodeHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpAttempts = 0;
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  res.status(StatusCodes.OK).json({
    status: 'success',
    message: 'OTP verified',
    data: { emailVerified: true }
  });
});
