import { StatusCodes } from 'http-status-codes';
import Task from '../models/Task.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { uploadBuffer, deleteAsset } from '../utils/cloudinaryUploader.js';

function parseDateOnly(dateStr) {
  // expects YYYY-MM-DD; returns start/end range for that day in UTC
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

async function uploadAttachments(files = []) {
  const folder = `${process.env.CLOUDINARY_FOLDER || 'tully'}/tasks`;
  const uploads = [];
  for (const file of files) {
    const uploaded = await uploadBuffer(file.buffer, { folder, resource_type: 'auto' });
    uploads.push({
      url: uploaded.url,
      publicId: uploaded.publicId,
      resourceType: uploaded.resourceType,
      originalName: file.originalname,
      mimeType: file.mimetype,
      bytes: uploaded.bytes
    });
  }
  return uploads;
}

export const listMyTasks = catchAsync(async (req, res) => {
  const { date, status, priority, q } = req.query;

  const filter = { user: req.user._id };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  if (date) {
    const range = parseDateOnly(date);
    if (range) filter.deadline = { $gte: range.start, $lte: range.end };
  }

  let query = Task.find(filter).sort({ deadline: 1, createdAt: -1 });

  if (q) query = query.find({ $text: { $search: q } });

  const tasks = await query;

  res.status(StatusCodes.OK).json({
    status: 'success',
    results: tasks.length,
    data: { tasks }
  });
});

export const createTask = catchAsync(async (req, res, next) => {
  const {
    title,
    course,
    time,
    deadline,
    overview,
    repeat = 'none',
    priority = 'Medium',
    notes,
    subtasks
  } = req.body;

  if (!title) return next(new AppError('title is required', 400));

  const attachments = req.files?.length ? await uploadAttachments(req.files) : [];

  let subtasksParsed = [];
  if (subtasks) {
    // accept JSON string or array
    try {
      subtasksParsed = typeof subtasks === 'string' ? JSON.parse(subtasks) : subtasks;
      if (!Array.isArray(subtasksParsed)) subtasksParsed = [];
    } catch (e) {
      subtasksParsed = [];
    }
  }

  const task = await Task.create({
    user: req.user._id,
    title,
    course,
    time,
    deadline: deadline ? new Date(deadline) : undefined,
    overview,
    repeat,
    priority,
    notes,
    attachments,
    subtasks: subtasksParsed
  });

  res.status(StatusCodes.CREATED).json({
    status: 'success',
    data: { task }
  });
});

export const getTask = catchAsync(async (req, res, next) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) return next(new AppError('Task not found', 404));

  res.status(StatusCodes.OK).json({
    status: 'success',
    data: { task }
  });
});

export const updateTask = catchAsync(async (req, res, next) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) return next(new AppError('Task not found', 404));

  const updatable = ['title', 'course', 'time', 'deadline', 'overview', 'repeat', 'priority', 'notes', 'status'];
  updatable.forEach((k) => {
    if (req.body[k] !== undefined) {
      if (k === 'deadline') task.deadline = req.body.deadline ? new Date(req.body.deadline) : undefined;
      else task[k] = req.body[k];
    }
  });

  if (req.body.subtasks !== undefined) {
    try {
      const parsed = typeof req.body.subtasks === 'string' ? JSON.parse(req.body.subtasks) : req.body.subtasks;
      task.subtasks = Array.isArray(parsed) ? parsed : task.subtasks;
    } catch (e) {}
  }

  if (req.files?.length) {
    const newAtt = await uploadAttachments(req.files);
    task.attachments.push(...newAtt);
  }

  await task.save();

  res.status(StatusCodes.OK).json({
    status: 'success',
    data: { task }
  });
});

export const markDone = catchAsync(async (req, res, next) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) return next(new AppError('Task not found', 404));

  task.status = 'done';
  task.doneAt = new Date();
  await task.save();

  res.status(StatusCodes.OK).json({
    status: 'success',
    data: { task }
  });
});

export const deleteTask = catchAsync(async (req, res, next) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) return next(new AppError('Task not found', 404));

  // delete attachments from cloudinary
  for (const att of task.attachments) {
    await deleteAsset(att.publicId, att.resourceType || 'image');
  }

  await task.deleteOne();

  res.status(StatusCodes.NO_CONTENT).send();
});

export const deleteAttachment = catchAsync(async (req, res, next) => {
  const { id, attachmentId } = req.params;

  const task = await Task.findOne({ _id: id, user: req.user._id });
  if (!task) return next(new AppError('Task not found', 404));

  const att = task.attachments.id(attachmentId);
  if (!att) return next(new AppError('Attachment not found', 404));

  await deleteAsset(att.publicId, att.resourceType || 'image');

  att.deleteOne();
  await task.save();

  res.status(StatusCodes.OK).json({
    status: 'success',
    data: { task }
  });
});
