// import mongoose from 'mongoose';

// const verificationItemSchema = new mongoose.Schema({
//   label: { type: String, required: true },
//   completed: { type: Boolean, default: false },
//   completedAt: { type: Date },
//   photo: { type: String }, // Base64 string or URL
//   comment: { type: String }
// });

// const verificationSchema = new mongoose.Schema(
//   {
//     room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
//     checklist: { type: mongoose.Schema.Types.ObjectId, ref: 'Checklist', required: true },
//     technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     verifiedAt: { type: Date, default: Date.now },
//     submittedAt: { type: Date },
//     validatedAt: { type: Date },
//     notes: { type: String },
//     items: [verificationItemSchema],
//     status: { type: String, enum: ['draft', 'submitted', 'validated', 'completed', 'incomplete'], default: 'draft' }
//   },
//   { timestamps: true }
// );

// export default mongoose.model('Verification', verificationSchema);

import mongoose from 'mongoose';

// ✅ FIX: Accepter tous les champs envoyés par le backend
const verificationItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId },  // ← AJOUTÉ
  label: { type: String, required: true },
  required: { type: Boolean, default: false },        // ← AJOUTÉ
  order: { type: Number, default: 0 },               // ← AJOUTÉ
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  photo: { type: String },
  notes: { type: String },    // ← "notes" pas "comment"
  comment: { type: String },  // ← garder les deux pour compatibilité
});

const verificationSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    checklist: { type: mongoose.Schema.Types.ObjectId, ref: 'Checklist', required: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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