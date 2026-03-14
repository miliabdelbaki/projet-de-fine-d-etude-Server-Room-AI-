import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    checklist: { type: mongoose.Schema.Types.ObjectId, ref: 'Checklist' },
    technicians: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model('Room', roomSchema);
