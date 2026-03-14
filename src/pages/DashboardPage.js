import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { People, Room } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { usersAPI, roomsAPI } from '../services/api';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRooms: 0,
  });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const results = await Promise.allSettled([
        usersAPI.getAll(),
        roomsAPI.getAll(),
      ]);

      const users = results[0].status === 'fulfilled' ? results[0].value : [];
      const rooms = results[1].status === 'fulfilled' ? results[1].value : [];

      const errors = results.filter(r => r.status === 'rejected');
      if (errors.length > 0) {
        console.error('Dashboard loadData errors', errors.map(e => e.reason));
        enqueueSnackbar('Erreur lors du chargement de certaines données', { variant: 'error' });
      }

      // Statistiques
      setStats({
        totalUsers: users.length,
        totalRooms: rooms.length,
      });

    } catch (error) {
      console.error('Dashboard loadData unexpected error', error);
      enqueueSnackbar('Erreur lors du chargement des données', { variant: 'error' });
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

  const statCards = [
    { title: 'Utilisateurs', value: stats.totalUsers, icon: <People />, color: '#1976d2' },
    { title: 'Salles', value: stats.totalRooms, icon: <Room />, color: '#2e7d32' },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      {/* Statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card sx={{ bgcolor: stat.color, color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ fontSize: 48, opacity: 0.3 }}>
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

    </Box>
  );
}