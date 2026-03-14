import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Charger explicitement le .env situé dans le même dossier que ce fichier
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Configurables via .env
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@serverguardian.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password123';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'ServerRoom';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'technicien' },
  displayName: { type: String },
  approved: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    // S'assurer d'utiliser la même DB que le serveur (configurable via MONGO_DB_NAME)
    await mongoose.connect(process.env.MONGODB_URI, { dbName: MONGO_DB_NAME });
    console.log('✅ Connecté');
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log('⚠️  Admin existe déjà:', ADMIN_EMAIL);
      process.exit(0);
    }
    const passwordHash = await bcrypt.hash(ADMIN_PASS, 12);

    const admin = await User.create({
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
      displayName: 'Admin Principal',
      approved: true
    });

    console.log('\n✅ ADMIN CRÉÉ !');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Mot de passe:', ADMIN_PASS);
    console.log('   _id:', admin._id.toString(), '\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    process.exit(1);
  }
}

createAdmin();