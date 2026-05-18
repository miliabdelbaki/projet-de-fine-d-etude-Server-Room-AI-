import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { 
      type: String, unique: true, required: true, 
      lowercase: true, trim: true 
    },
    passwordHash: { type: String, required: true },
    role: { 
      type: String, 
      default: 'employe',   // ← CHANGÉ : employe est le rôle par défaut
      enum: ['employe', 'technicien', 'admin'] 
    },
    displayName: { type: String },
    approved: { type: Boolean, default: false }, // ← CHANGÉ : false par défaut
    resetToken: { type: String, sparse: true },
    resetExpires: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);