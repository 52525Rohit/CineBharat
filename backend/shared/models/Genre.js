import mongoose from 'mongoose';

const genreSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
});

export const Genre = mongoose.model('Genre', genreSchema);
