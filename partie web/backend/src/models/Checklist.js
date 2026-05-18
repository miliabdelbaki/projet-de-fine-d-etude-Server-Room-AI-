import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
});

const checklistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    items: { type: [itemSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Checklist', checklistSchema);
