# 🚀 INSTALLATION DU DASHBOARD

## Étapes rapides

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer le backend
cd ~/Desktop/loeni-auth-api
npm run dev

# 3. Dans un autre terminal, démarrer le dashboard
cd ~/Desktop/dashboard-loeni-react
npm start
```

## Accès

- Dashboard: http://localhost:3000
- Backend: http://localhost:4000

## Compte admin par défaut

Créez d'abord un admin dans MongoDB:

```json
{
  "email": "admin@serverguardian.com",
  "passwordHash": "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEZPQG",
  "role": "admin",
  "displayName": "Admin Principal",
  "approved": true
}
```

Email: admin@serverguardian.com
Mot de passe: password123

## Structure

- src/services/api.js → Appels API
- src/components/ → Composants réutilisables
- src/pages/ → Pages du dashboard

Consultez README.md pour plus de détails.
