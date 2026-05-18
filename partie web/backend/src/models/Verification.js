
import mongoose from 'mongoose';


const verificationItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId },  
  label: { type: String, required: true },
  required: { type: Boolean, default: false },       
  order: { type: Number, default: 0 },               
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  photo: { type: String },
  notes: { type: String },   
  comment: { type: String }, 
});

const verificationSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    checklist: { type: mongoose.Schema.Types.ObjectId, ref: 'Checklist', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    validatedAt: { type: Date },
    notes: { type: String },
    items: [verificationItemSchema],
    status: {
      type: String,
      enum: ['draft', 'submitted', 'validated', 'completed', 'incomplete'],
      default: 'draft'
    }
  },
  { timestamps: true }
);

export default mongoose.model('Verification', verificationSchema);