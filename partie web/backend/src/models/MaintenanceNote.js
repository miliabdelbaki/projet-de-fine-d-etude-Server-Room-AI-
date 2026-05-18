import mongoose from 'mongoose';

const maintenanceNoteSchema = new mongoose.Schema(
  {
    room:          { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    /** Si renseigné : décision unique pour cette vérification (pas seulement la salle). */
    verification:  { type: mongoose.Schema.Types.ObjectId, ref: 'Verification', sparse: true, unique: true },
    admin:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    priority:      { type: String, enum: ['Faible','Moyenne','Haute','Critique'], default: 'Moyenne' },
    note:          { type: String, required: true },
    aiState:       { type: String },   // snapshot état au moment de la décision
    aiRisk:        { type: Number },   // snapshot risque %
    
    // Intervention tracking for technicians
    status:             { type: String, enum: ['EN_ATTENTE', 'EN_COURS', 'TERMINEE'], default: 'EN_ATTENTE' },
    assignedTechnician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
    technicianFeedback: { type: String },
    resolvedAt:         { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('MaintenanceNote', maintenanceNoteSchema);
