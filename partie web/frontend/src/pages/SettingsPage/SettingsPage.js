import './SettingsPage.css';
import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, TextField, Button, Divider,
  Switch, FormControlLabel, Alert, CircularProgress
} from '@mui/material';
import { Lock, Notifications, Save, Security, LightMode, DarkMode } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { authAPI } from '../../services/api';
import { useAppTheme } from '../ThemeContext/ThemeContext';



export default function SettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { isDark, toggleTheme } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({ displayName: '', email: '' });
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [prefs, setPrefs] = useState({
    notifications_email: true,
    notifications_dashboard: true,
    auto_refresh: true,
  });

  useEffect(() => {
    const loadProfile = async () => {
      // D'abord on affiche ce qu'on a en localStorage
      const localUser = authAPI.getCurrentUser();
      if (localUser) {
        setUser(localUser);
        setProfileData({ displayName: localUser.displayName || '', email: localUser.email || '' });
      }
      // Ensuite on rafraîchit depuis le backend (source de vérité)
      try {
        const token = localStorage.getItem('token');
        const API_BASE = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
        const res = await fetch(`${API_BASE}/api/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const freshUser = data.user || data;
          // Fusionner avec ce qu'on a en localStorage (garder le token etc.)
          const merged = { ...localUser, ...freshUser };
          localStorage.setItem('user', JSON.stringify(merged));
          setUser(merged);
          setProfileData({ displayName: freshUser.displayName || '', email: freshUser.email || '' });
        }
      } catch { /* fallback sur localStorage */ }
    };
    loadProfile();
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      try { setPrefs(JSON.parse(saved)); } catch {}
    }
  }, []);

  const handleSaveProfile = async () => {
    if (!profileData.displayName.trim()) {
      enqueueSnackbar('Le nom ne peut pas être vide', { variant: 'error' }); return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const response = await fetch(`${API_BASE}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: profileData.displayName.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        // Mettre à jour localStorage pour que le nom s'affiche partout immédiatement
        const updatedUser = { ...user, displayName: data.user.displayName };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        enqueueSnackbar('✅ Profil mis à jour avec succès', { variant: 'success' });
      } else {
        enqueueSnackbar(data.message || 'Erreur de mise à jour', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Serveur indisponible', { variant: 'error' });
    } finally { setLoading(false); }
  };


  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      enqueueSnackbar('Les mots de passe ne correspondent pas', { variant: 'error' }); return;
    }
    if (passwordData.new_password.length < 8) {
      enqueueSnackbar('Minimum 8 caractères requis', { variant: 'error' }); return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const response = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        enqueueSnackbar('✅ Mot de passe modifié avec succès', { variant: 'success' });
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        enqueueSnackbar(data.message || 'Erreur lors du changement', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Serveur indisponible', { variant: 'error' });
    } finally { setLoading(false); }
  };


  const handleSavePrefs = () => {
    localStorage.setItem('app_settings', JSON.stringify(prefs));
    enqueueSnackbar('Préférences sauvegardées', { variant: 'success' });
  };

  if (!user) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <CircularProgress />
    </Box>
  );

  const SectionHeading = ({ children }) => (
    <div className="section-heading">
      <div className="section-heading-bar" />
      <span className="section-heading-text">{children}</span>
    </div>
  );

  return (
    <>
      
      <Box className="settings-page">
        <div className="page-header">
          <div>
            <div className="page-title">Paramètres</div>
            <div className="page-subtitle">// Configuration du compte &amp; du système</div>
          </div>
        </div>

        <Grid container spacing={3}>
          {/* LEFT */}
          <Grid item xs={12} md={4}>
            <div className="profile-card">
              <div className="profile-avatar">
                {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="profile-name">{user?.displayName || 'Opérateur'}</div>
              <div className="profile-email">{user?.email}</div>
              <span className="role-badge">
                {user?.role === 'admin' ? '⬡ Administrateur' : '◈ Technicien'}
              </span>
            </div>


          </Grid>

          {/* RIGHT */}
          <Grid item xs={12} md={8}>

            {/* PROFILE */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <SectionHeading>Informations du profil</SectionHeading>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Nom d'affichage" value={profileData.displayName}
                    onChange={e => setProfileData({ ...profileData, displayName: e.target.value })}
                    helperText="Affiché dans l'interface opérateur" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth type="email" label="Adresse email" value={profileData.email}
                    disabled helperText="L'identifiant ne peut pas être modifié" />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained"
                    startIcon={loading ? <CircularProgress size={16} /> : <Save />}
                    onClick={handleSaveProfile} disabled={loading}>
                    Enregistrer
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* PASSWORD */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <SectionHeading>Sécurité — Mot de passe</SectionHeading>
              <Alert severity="info" sx={{ mb: 2 }}>Minimum 8 caractères requis.</Alert>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth type="password" label="Mot de passe actuel"
                    value={passwordData.current_password}
                    onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth type="password" label="Nouveau mot de passe"
                    value={passwordData.new_password}
                    onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth type="password" label="Confirmer"
                    value={passwordData.confirm_password}
                    onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })} />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="outlined" startIcon={<Security />}
                    onClick={handleChangePassword}
                    disabled={!passwordData.current_password || !passwordData.new_password || loading}>
                    Changer le mot de passe
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* PREFERENCES */}
            <Paper sx={{ p: 3 }}>
              <SectionHeading>Préférences système</SectionHeading>

              {/* ══ THEME TOGGLE ══ */}
              <button className="theme-toggle-btn" onClick={toggleTheme}>
                <span style={{ fontSize: 20, color: 'var(--accent)' }}>
                  {isDark ? '🌙' : '☀️'}
                </span>
                <div className="theme-toggle-label">
                  <span className="theme-toggle-title">
                    {isDark ? 'Mode sombre actif' : 'Mode clair actif'}
                  </span>
                  <span className="theme-toggle-subtitle">
                    Cliquez pour passer en mode {isDark ? 'clair' : 'sombre'}
                  </span>
                </div>
                <div className={`theme-toggle-track ${isDark ? 'active' : ''}`}>
                  <div className="theme-toggle-thumb">
                    {isDark
                      ? <DarkMode sx={{ fontSize: 12, color: '#ff6f00' }} />
                      : <LightMode sx={{ fontSize: 12, color: '#ff9500' }} />
                    }
                  </div>
                </div>
              </button>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={1}>
                {[
                  { key: 'notifications_email', label: 'Notifications par email' },
                  { key: 'notifications_dashboard', label: 'Notifications dans le tableau de bord' },
                  { key: 'auto_refresh', label: 'Actualisation automatique des données' },
                ].map(pref => (
                  <Grid item xs={12} key={pref.key}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={prefs[pref.key]}
                          onChange={e => setPrefs({ ...prefs, [pref.key]: e.target.checked })}
                        />
                      }
                      label={<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{pref.label}</span>}
                    />
                  </Grid>
                ))}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Button variant="contained" startIcon={<Save />} onClick={handleSavePrefs}>
                    Sauvegarder les préférences
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
