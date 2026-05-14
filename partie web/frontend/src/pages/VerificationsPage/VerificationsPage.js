import './VerificationsPage.css';
import React, { useState, useEffect } from 'react';

import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, Chip, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { roomsAPI, verificationsAPI } from '../../services/api';


export default function VerificationsPage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => { loadRooms(); }, []);
  useEffect(() => { if (selectedRoomId) loadVerifications(selectedRoomId); }, [selectedRoomId]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await roomsAPI.getAll();
      setRooms(data);
      if (data.length > 0) setSelectedRoomId(data[0].id);
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur de chargement', { variant: 'error' });
    } finally { setLoading(false); }
  };

  const loadVerifications = async (roomId) => {
    try {
      setLoading(true);
      const data = await verificationsAPI.getByRoom(roomId);
      setVerifications(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur de chargement', { variant: 'error' });
      setVerifications([]);
    } finally { setLoading(false); }
  };

  const statusColor = (s) => s === 'completed' ? 'success' : s === 'in_progress' ? 'warning' : 'default';
  const statusLabel = (s) => s === 'completed' ? 'Complété' : s === 'in_progress' ? 'En cours' : s;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><CircularProgress /></Box>;

  return (
    <Box className="ind-page">
        <div className="ind-page-header">
          <div>
            <div className="ind-page-title">Historique par salle</div>
            <div className="ind-page-subtitle">// Traçabilité des vérifications unitaires</div>
          </div>
          <div className="ind-header-actions">
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Salle</InputLabel>
              <Select value={selectedRoomId} label="Salle" onChange={e => setSelectedRoomId(e.target.value)}
                sx={{ background: '#0d1117' }}>
                {rooms.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
              </Select>
            </FormControl>
          </div>
        </div>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Horodatage</TableCell>
                  <TableCell>Opérateur</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Observations</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {verifications.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell sx={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#5a6a7a' }}>
                      {new Date(v.submittedAt || v.createdAt).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#8a9aaa' }}>
                      {v.technician?.displayName || v.technician?.email || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip label={statusLabel(v.status)} color={statusColor(v.status)} size="small" />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#5a6a7a', maxWidth: 300 }}>
                      {v.notes || v.comment || <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#2a3a4a' }}>— Aucune observation —</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {verifications.length === 0 && (
                  <TableRow className="ind-empty-row"><TableCell colSpan={4}>— Aucune vérification pour cette salle —</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
  );
}
