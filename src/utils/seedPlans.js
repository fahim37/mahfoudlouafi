/**
 * Optional helper script to seed default plans.
 * Run with: node src/utils/seedPlans.js
 */
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

dotenv.config();
await connectDB();

const plans = [
  { name: 'Basic', priceMonth: 0, priceYear: 0, taskLimitYear: 200 },
  { name: 'Premium', priceMonth: 9, priceYear: 90, taskLimitYear: 500 },
  { name: 'Advanced', priceMonth: 18, priceYear: 180, taskLimitYear: 1000 }
];

for (const p of plans) {
  await SubscriptionPlan.updateOne({ name: p.name }, p, { upsert: true });
}

console.log('✅ Seeded plans');
process.exit(0);
