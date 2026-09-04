import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    refreshTokenHash: { type: String, default: null },
    // MVP: plan fields live on the user doc. Production splits this into the
    // Postgres billing ledger (subscriptions/payments) — see docs, §06/§21.
    plan: { type: String, enum: ['free', 'basic', 'standard', 'premium'], default: 'free' },
    // Which profile "Who's Watching" should restore on refresh - kept
    // server-side (not localStorage) so it's tied to the account, not the
    // browser/device.
    lastActiveProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
