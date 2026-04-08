
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './src/routes/auth.js';
import checklistsRoutes from './src/routes/checklists.js';
import roomsRoutes from './src/routes/rooms.js';
import adminRoutes from './src/routes/admin.js';
import verificationsRoutes from './src/routes/verifications.js';
import aiRoutes from './src/routes/ai.js';
import { apiLimiter } from './src/middleware/limiter.js';

dotenv.config();

// Ajoutez ces lignes pour débugger
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅' : '❌');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅' : '❌');

const app = express();

// Middlewares globaux
// CORS: prefer explicit frontend origin(s); default to localhost:3000 for dev
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    console.log(`📩 ${req.method} ${req.path}`, {
      contentType: req.get('content-type'),
      bodyKeys: Object.keys(req.body || {}),
      bodySize: JSON.stringify(req.body).length,
    });
  }
  next();
});

// Limiter (optionnel mais recommandé)
app.use('/api/auth', apiLimiter);

// Routes (montées sous le préfixe /api pour compatibilité avec le frontend)
app.use('/api/auth', authRoutes);
app.use('/api/checklists', checklistsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/verifications', verificationsRoutes);
app.use('/api/ai', aiRoutes);

app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

const PORT = process.env.PORT || 5000;
let server;

const DEFAULT_LOCAL_MONGO = 'mongodb://127.0.0.1:27017/loeni';
const REQUESTED_MONGO_URI = process.env.MONGODB_URI;
const PRIMARY_MONGO_URI = REQUESTED_MONGO_URI || DEFAULT_LOCAL_MONGO;

async function startServer() {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ API démarrée sur http://localhost:${PORT} (préfixe /api)`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} déjà utilisé!`);
      setTimeout(() => process.exit(1), 1000);
    }
  });
}

(async () => {
  try {
    if (!REQUESTED_MONGO_URI) {
      console.warn('⚠️  Aucune variable MONGODB_URI fournie — utilisation de MongoDB local en fallback.');
    }

    await mongoose.connect(PRIMARY_MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      dbName: 'ServerRoom', // Base de données changée à ServerRoom
    });

    console.log('✅ MongoDB connecté:', REQUESTED_MONGO_URI ? 'URI fournie' : 'fallback local');
    await startServer();
  } catch (err) {
    console.error('❌ Erreur MongoDB :', err.message || err);

    // Si l'erreur est liée à la résolution SRV (Atlas +mongodb+srv), proposer/forker vers un fallback local
    if (REQUESTED_MONGO_URI && REQUESTED_MONGO_URI.startsWith('mongodb+srv') && String(err.message).includes('querySrv')) {
      console.warn('⚠️  Échec de résolution DNS SRV pour MongoDB Atlas. Tentative de connexion au MongoDB local en fallback...');
      try {
        await mongoose.connect(DEFAULT_LOCAL_MONGO, {
          serverSelectionTimeoutMS: 5000,
          dbName: 'ServerRoom',
        });
        console.log('✅ Connexion de secours à MongoDB locale réussie');
        await startServer();
        return;
      } catch (e2) {
        console.error('❌ Échec du fallback local:', e2.message || e2);
      }
    }

    console.error("⏳ Vérifiez MONGODB_URI et la connectivité DNS/pare-feu. Le processus va s'arrêter dans 5s.");
    setTimeout(() => process.exit(1), 5000);
  }
})();

// Gestion des erreurs non attrapées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', async (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  if (server) {
    server.close(async () => {
      try {
        await mongoose.connection.close();
      } catch (e) {
        console.error('Erreur MongoDB:', e.message);
      }
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⏹️  SIGTERM reçu, arrêt du serveur...');
  if (server) {
    server.close(async () => {
      console.log('✅ Serveur fermé');
      try {
        await mongoose.connection.close();
        console.log('✅ Connexion MongoDB fermée');
      } catch (err) {
        console.error('❌ Erreur lors de la fermeture de MongoDB:', err);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('⏹️  SIGINT reçu, arrêt du serveur...');
  if (server) {
    server.close(async () => {
      console.log('✅ Serveur fermé');
      try {
        await mongoose.connection.close();
        console.log('✅ Connexion MongoDB fermée');
      } catch (err) {
        console.error('❌ Erreur lors de la fermeture de MongoDB:', err);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Nodemon sends SIGUSR2 when restarting; handle it to gracefully restart
process.once('SIGUSR2', async () => {
  console.log('🔄 SIGUSR2 reçu (nodemon restart) — fermeture propre...');
  if (server) {
    server.close(async () => {
      try {
        await mongoose.connection.close();
        console.log('✅ Connexion MongoDB fermée pour redémarrage');
      } catch (e) {
        console.error('Erreur lors de la fermeture MongoDB:', e?.message || e);
      }
      // re-emit SIGUSR2 to allow nodemon to restart the process
      process.kill(process.pid, 'SIGUSR2');
    });
  } else {
    process.kill(process.pid, 'SIGUSR2');
  }
});

// Safety: if nodemon fails to kill old process, detect EADDRINUSE and log helpful message
// (server 'error' listener above already handles immediate EADDRINUSE on bind)
