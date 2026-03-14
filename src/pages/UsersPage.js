import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Alert
} from '@mui/material';
import { CheckCircle, Cancel, Delete, Refresh } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { usersAPI } from '../services/api';

export default function UsersPage() {
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const [allUsers, pending] = await Promise.all([
        usersAPI.getAll(),
        usersAPI.getPending(),
      ]);
      setUsers(allUsers);
      setPendingUsers(pending);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement des utilisateurs', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await usersAPI.approve(userId);
      enqueueSnackbar('Utilisateur validé avec succès', { variant: 'success' });
      loadUsers();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la validation', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await usersAPI.delete(deleteDialog.user.id);
      enqueueSnackbar('Utilisateur supprimé', { variant: 'success' });
      setDeleteDialog({ open: false, user: null });
      loadUsers();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'error',
      technicien: 'primary',
    };
    return <Chip label={role} color={colors[role] || 'default'} size="small" />;
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'success',
      pending: 'warning',
      inactive: 'default',
    };
    const labels = {
      active: 'Actif',
      pending: 'En attente',
      inactive: 'Inactif',
    };
    return <Chip label={labels[status]} color={colors[status]} size="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Utilisateurs</Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={loadUsers}>
          Actualiser
        </Button>
      </Box>

      {pendingUsers.length > 0 && tabValue === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {pendingUsers.length} utilisateur(s) en attente de validation
          <Button size="small" onClick={() => setTabValue(1)} sx={{ ml: 2 }}>
            Voir
          </Button>
        </Alert>
      )}

      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Tous les utilisateurs" />
          <Tab 
            label={`En attente (${pendingUsers.length})`} 
            icon={pendingUsers.length > 0 ? <Chip label={pendingUsers.length} size="small" color="warning" /> : null}
            iconPosition="end"
          />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Nom</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Créé le</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(tabValue === 0 ? users : pendingUsers).map((user) => (
                <TableRow 
                  key={user.id}
                  sx={{ 
                    bgcolor: user.status === 'pending' ? 'warning.lighter' : 'inherit',
                  }}
                >
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.full_name || user.displayName || '-'}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell align="right">
                    {user.status === 'pending' && (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleApprove(user.id)}
                        title="Valider"
                      >
                        <CheckCircle />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog({ open: true, user })}
                      title="Supprimer"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {(tabValue === 0 ? users : pendingUsers).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      Aucun utilisateur
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog Suppression */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{deleteDialog.user?.email}</strong> ?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}