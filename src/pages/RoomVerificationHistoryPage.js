import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import { roomsAPI, verificationsAPI } from '../services/api';

export default function RoomVerificationHistoryPage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      loadVerifications(selectedRoomId);
    }
  }, [selectedRoomId]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await roomsAPI.getAll();
      setRooms(data);
      if (data.length > 0) setSelectedRoomId(data[0].id);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Erreur lors du chargement de l’historique';
      enqueueSnackbar(message, { variant: 'error' });
      setVerifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadVerifications = async (roomId) => {
    try {
      setLoading(true);
      const data = await verificationsAPI.getByRoom(roomId);
      setVerifications(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      console.error('RoomVerificationHistoryPage: loadVerifications', error);
      const message = error?.response?.data?.message || error?.message || 'Erreur lors du chargement de l’historique';
      enqueueSnackbar(message, { variant: 'error' });
      setVerifications([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Historique des vérifications par salle</Typography>
        <FormControl sx={{ minWidth: 240 }} size="small">
          <InputLabel>Salle</InputLabel>
          <Select
            value={selectedRoomId}
            label="Salle"
            onChange={(e) => setSelectedRoomId(e.target.value)}
          >
            {rooms.map((room) => (
              <MenuItem key={room.id} value={room.id}>
                {room.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Technicien</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Commentaire</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {verifications.map((verification) => (
                <TableRow key={verification.id}>
                  <TableCell>{new Date(verification.submittedAt || verification.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>{verification.technician?.displayName || verification.technician?.email || '—'}</TableCell>
                  <TableCell>{verification.status}</TableCell>
                  <TableCell>{verification.notes || verification.comment || '—'}</TableCell>
                </TableRow>
              ))}
              {verifications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      Aucune vérification trouvée pour cette salle
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
