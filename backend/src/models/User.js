
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'technicien', enum: ['technicien', 'admin'] },
    displayName: { type: String },

    // Admin approval required for technicians
    approved: { type: Boolean, default: true },

    // Reset mot de passe
    resetToken: { type: String, sparse: true },
    resetExpires: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
