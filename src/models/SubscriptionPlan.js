import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // Basic/Premium/Advanced
    priceMonth: { type: Number, default: 0 },
    priceYear: { type: Number, default: 0 },
    taskLimitYear: { type: Number, required: true, min: 1 }
  },
  { timestamps: true }
);

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
