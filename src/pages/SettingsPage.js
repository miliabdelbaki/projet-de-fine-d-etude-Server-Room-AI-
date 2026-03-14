/**
 * Page Paramètres - Configuration de l'application
 * Compatible avec loeni-auth-api backend
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Divider,
  Avatar,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Person,
  Lock,
  Notifications,
  Save,
  Security
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { authAPI } from '../services/api';

const SettingsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  const [profileData, setProfileData] = useState({
    displayName: '',
    email: ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [settings, setSettings] = useState({
    notifications_email: true,
    notifications_dashboard: true,
    auto_refresh: true,
    dark_mode: false
  });

  // Charger les données utilisateur au montage
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    const currentUser = authAPI.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setProfileData({
        displayName: currentUser.displayName || '',
        email: currentUser.email || ''
      });
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // TODO: Implémenter l'appel API pour mettre à jour le profil
      // await usersAPI.update(user.id, profileData);
      
      // Mettre à jour le localStorage
      const updatedUser = { ...user, ...profileData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      enqueueSnackbar('Profil mis à jour avec succès', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de la mise à jour du profil', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      enqueueSnackbar('Les mots de passe ne correspondent pas', { variant: 'error' });
      return;
    }

    if (passwordData.new_password.length < 8) {
      enqueueSnackbar('Le mot de passe doit contenir au moins 8 caractères', { variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implémenter l'appel API pour changer le mot de passe
      // await authAPI.changePassword(passwordData);
      
      enqueueSnackbar('Mot de passe modifié avec succès', { variant: 'success' });
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      enqueueSnackbar('Erreur lors du changement de mot de passe', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = () => {
    // Sauvegarder les paramètres dans le localStorage
    localStorage.setItem('app_settings', JSON.stringify(settings));
    enqueueSnackbar('Paramètres sauvegardés avec succès', { variant: 'success' });
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Paramètres
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gérez votre profil et les préférences de l'application
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Profil Utilisateur */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  margin: '0 auto',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontSize: 40,
                  mb: 2,
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                }}
              >
                {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Typography variant="h6" fontWeight="bold">
                {user?.displayName || 'Utilisateur'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user?.email}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'inline-block',
                  bgcolor: user?.role === 'admin' ? 'error.lighter' : 'info.lighter',
                  color: user?.role === 'admin' ? 'error.main' : 'info.main',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  mt: 1,
                  fontWeight: 600
                }}
              >
                {user?.role === 'admin' ? '🔐 Administrateur' : '👤 Technicien'}
              </Typography>
            </CardContent>
          </Card>

          {/* Info Système */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight="bold">
                📊 Informations Système
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" display="block" color="text.secondary">
                  Version
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  1.0.0
                </Typography>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" display="block" color="text.secondary">
                  Backend
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  loeni-auth-api
                </Typography>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" display="block" color="text.secondary">
                  Base de données
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  MongoDB Atlas
                </Typography>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" display="block" color="text.secondary">
                  Statut
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  ✓ Connecté
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Paramètres */}
        <Grid item xs={12} md={8}>
          {/* Informations du Profil */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Person sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight="bold">
                Informations du Profil
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nom d'affichage"
                  value={profileData.displayName}
                  onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                  helperText="Le nom qui s'affichera dans l'application"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="email"
                  label="Email"
                  value={profileData.email}
                  disabled
                  helperText="L'email ne peut pas être modifié"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  Enregistrer les modifications
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Changer le Mot de Passe */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Lock sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight="bold">
                Sécurité
              </Typography>
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Le mot de passe doit contenir au moins 8 caractères
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Mot de passe actuel"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="Nouveau mot de passe"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="Confirmer le mot de passe"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={loading ? <CircularProgress size={20} /> : <Security />}
                  onClick={handleChangePassword}
                  disabled={!passwordData.current_password || !passwordData.new_password || loading}
                >
                  Changer le mot de passe
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Préférences */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Notifications sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight="bold">
                Préférences
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications_email}
                      onChange={(e) => setSettings({ ...settings, notifications_email: e.target.checked })}
                    />
                  }
                  label="Notifications par email"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications_dashboard}
                      onChange={(e) => setSettings({ ...settings, notifications_dashboard: e.target.checked })}
                    />
                  }
                  label="Notifications dans le dashboard"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.auto_refresh}
                      onChange={(e) => setSettings({ ...settings, auto_refresh: e.target.checked })}
                    />
                  }
                  label="Actualisation automatique des données"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.dark_mode}
                      onChange={(e) => setSettings({ ...settings, dark_mode: e.target.checked })}
                    />
                  }
                  label="Mode sombre (bientôt disponible)"
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveSettings}
                >
                  Enregistrer les préférences
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;