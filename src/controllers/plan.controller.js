import { StatusCodes } from 'http-status-codes';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

export const createPlan = catchAsync(async (req, res, next) => {
  const { name, priceMonth = 0, priceYear = 0, taskLimitYear } = req.body;
  if (!name || !taskLimitYear) return next(new AppError('name and taskLimitYear are required', 400));

  const plan = await SubscriptionPlan.create({ name, priceMonth, priceYear, taskLimitYear });

  res.status(StatusCodes.CREATED).json({ status: 'success', data: { plan } });
});

export const listPlans = catchAsync(async (req, res) => {
  const plans = await SubscriptionPlan.find().sort({ priceMonth: 1 });
  res.status(StatusCodes.OK).json({ status: 'success', results: plans.length, data: { plans } });
});

export const updatePlan = catchAsync(async (req, res, next) => {
  const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!plan) return next(new AppError('Plan not found', 404));
  res.status(StatusCodes.OK).json({ status: 'success', data: { plan } });
});

export const deletePlan = catchAsync(async (req, res, next) => {
  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) return next(new AppError('Plan not found', 404));

  const usersUsing = await User.countDocuments({ plan: plan._id });
  if (usersUsing > 0) {
    return next(new AppError('Cannot delete plan while users are subscribed to it', 409));
  }

  await plan.deleteOne();
  res.status(StatusCodes.NO_CONTENT).send();
});
