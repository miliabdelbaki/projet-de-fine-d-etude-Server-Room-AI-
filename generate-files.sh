#!/bin/bash

mkdir -p src/{components,pages}

# ProtectedRoute
cat > src/components/ProtectedRoute.js << 'EOF'
import { Navigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function ProtectedRoute({ children }) {
  const user = authAPI.getCurrentUser();
  return user ? children : <Navigate to="/login" replace />;
}
EOF

# Layout
cat > src/components/Layout.js << 'EOF'
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon, ListItemText, IconButton } from '@mui/material';
import { Dashboard, People, Room, Checklist, Assessment, History, Logout } from '@mui/icons-material';
import { authAPI } from '../services/api';

const DRAWER_WIDTH = 240;

export default function Layout() {
  const navigate = useNavigate();
  const user = authAPI.getCurrentUser();

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Utilisateurs', icon: <People />, path: '/users' },
    { text: 'Salles', icon: <Room />, path: '/rooms' },
    { text: 'Checklists', icon: <Checklist />, path: '/checklists' },
    { text: 'Vérifications', icon: <Assessment />, path: '/verifications' },
    { text: 'Historique', icon: <History />, path: '/history' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            ServerRoom Guardian
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>{user?.email}</Typography>
          <IconButton color="inherit" onClick={handleLogout}><Logout /></IconButton>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}>
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItemButton key={item.path} onClick={() => navigate(item.path)}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
EOF

# LoginPage
cat > src/pages/LoginPage.js << 'EOF'
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, TextField, Button, Typography, Container } from '@mui/material';
import { useSnackbar } from 'notistack';
import { authAPI } from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.login(email, password);
      enqueueSnackbar('Connexion réussie', { variant: 'success' });
      navigate('/dashboard');
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || 'Erreur de connexion', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Card sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" align="center" gutterBottom>ServerRoom Guardian</Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>Dashboard Admin</Typography>
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} margin="normal" required />
            <TextField fullWidth label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} margin="normal" required />
            <Button fullWidth type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 3 }}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </Card>
      </Box>
    </Container>
  );
}
EOF

# Pages simplifiées
for page in Dashboard Users Rooms Checklists Verifications History; do
  cat > src/pages/${page}Page.js << EOF
import React from 'react';
import { Typography, Box } from '@mui/material';

export default function ${page}Page() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>${page}</Typography>
      <Typography>Page ${page} - En cours de développement</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Cette page affichera les fonctionnalités de ${page}.
        Consultez le guide complet pour l'implémentation détaillée.
      </Typography>
    </Box>
  );
}
EOF
done

echo "✅ Tous les fichiers ont été générés avec succès!"
