import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'image' },
    originalName: String,
    mimeType: String,
    bytes: Number
  },
  { _id: true, timestamps: true }
);

const subTaskSchema = new mongoose.Schema(
  {
    topicName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isDone: { type: Boolean, default: false }
  },
  { _id: true, timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: [true, 'Task title is required'], trim: true },
    course: { type: String, trim: true },
    time: { type: String, trim: true }, // e.g. "12:20 pm"
    deadline: { type: Date }, // store as Date
    overview: { type: String, trim: true }, // e.g. "Daily/Weekly/Monthly"
    repeat: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    notes: { type: String, trim: true },

    status: { type: String, enum: ['pending', 'done'], default: 'pending' },
    doneAt: Date,

    attachments: [attachmentSchema],
    subtasks: [subTaskSchema]
  },
  { timestamps: true }
);

taskSchema.index({ title: 'text', notes: 'text', course: 'text' });

export default mongoose.model('Task', taskSchema);
