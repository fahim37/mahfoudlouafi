import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import User from '../models/User.js';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const REFRESH_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken';
const DEFAULT_ACCESS_MS = 15 * 60 * 1000;
const DEFAULT_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

function durationToMs(value, fallbackMs) {
  if (!value && fallbackMs) return fallbackMs;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d+)([smhd])?$/i);
    if (match) {
      const amount = Number(match[1]);
      const unit = (match[2] || 'm').toLowerCase();
      const unitMap = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
      return amount * (unitMap[unit] || 60_000);
    }
  }
  return fallbackMs;
}

export function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function sanitizeUser(user) {
  const raw = user.toObject ? user.toObject() : { ...user };
  delete raw.password;
  delete raw.refreshTokenId;
  delete raw.refreshTokenExpiresAt;
  delete raw.otpCodeHash;
  delete raw.otpAttempts;
  delete raw.otpExpiresAt;
  return raw;
}

function signAccessToken(id) {
  return jwt.sign({ id }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function buildRefreshToken(id) {
  const tokenId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + durationToMs(REFRESH_EXPIRES_IN, DEFAULT_REFRESH_MS));
  const refreshToken = jwt.sign({ id, tokenId }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
  return { refreshToken, tokenId, expiresAt };
}

function setRefreshTokenCookie(res, token, expiresAt) {
  const cookieOptions = {
    expires: expiresAt,
    httpOnly: true,
    sameSite: 'lax'
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie(REFRESH_COOKIE_NAME, token, cookieOptions);
}

export function clearRefreshTokenCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
}

export function extractRefreshToken(req) {
  return req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken || req.headers['x-refresh-token'];
}

export function verifyRefreshJwt(token) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
}

export const sendAuthTokens = async (user, statusCode, res) => {
  const accessToken = signAccessToken(user._id);
  const { refreshToken, tokenId, expiresAt } = buildRefreshToken(user._id);

  user.refreshTokenId = hashToken(tokenId);
  user.refreshTokenExpiresAt = expiresAt;
  await user.save({ validateBeforeSave: false });

  setRefreshTokenCookie(res, refreshToken, expiresAt);

  res.status(statusCode).json({
    status: 'success',
    accessToken,
    refreshToken,
    data: { user: sanitizeUser(user) }
  });
};

export const protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) return next(new AppError('You are not logged in', StatusCodes.UNAUTHORIZED));

  const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) return next(new AppError('The user belonging to this token no longer exists', 401));
  if (!currentUser.isActive) return next(new AppError('Account is inactive', 403));

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('Password recently changed. Please log in again.', 401));
  }

  req.user = currentUser;
  next();
});

export const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
};
