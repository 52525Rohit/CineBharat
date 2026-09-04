import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: '' },
    isKids: { type: Boolean, default: false },
    phone: { type: String, default: '', trim: true },
    location: { type: String, default: '', trim: true },
    bio: { type: String, default: '', trim: true, maxlength: 400 },
  },
  { timestamps: true },
);

export const Profile = mongoose.model('Profile', profileSchema);
