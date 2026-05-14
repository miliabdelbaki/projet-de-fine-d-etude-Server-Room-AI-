import './ActiveVerificationPage.css';
import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Card, CardContent, TextField, Typography, CircularProgress,
  Checkbox, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  Paper, Chip, LinearProgress
} from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { verificationsAPI, roomsAPI } from '../../services/api';


export default function ActiveVerificationPage() {
  const { verificationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State
  const [verification, setVerification] = useState(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [room, setRoom] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [photoData, setPhotoData] = useState(null);
  const [photoCancelDialog, setPhotoCancelDialog] = useState(false);

  // Form data for current item
  const [itemForm, setItemForm] = useState({
    completed: false,
    notes: '',
    photo: null
  });

  // Load verification
  useEffect(() => {
    loadVerification();
  }, [verificationId]);

  const loadVerification = async () => {
    try {
      setLoading(true);
      // Get all verifications and find the one matching verificationId
      const response = await verificationsAPI.getAll();
      const verif = response.find(v => v.id === verificationId);
      
      if (!verif) {
        enqueueSnackbar('Vérification introuvable', { variant: 'error' });
        navigate('/rooms');
        return;
      }

      setVerification(verif);
      
      // Load room info
      if (verif.room) {
        const allRooms = await roomsAPI.getAll();
        const r = allRooms.find(rm => rm.id === verif.room);
        setRoom(r);
      }

      // Initialize current item
      if (verif.items && verif.items.length > 0) {
        const item = verif.items[0];
        setItemForm({
          completed: item.completed || false,
          notes: item.notes || item.comment || '',
          photo: item.photo || null
        });
        setPhotoData(item.photo);
      }
    } catch (error) {
      console.error('Load verification error:', error);
      enqueueSnackbar('Erreur lors du chargement', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const currentItem = verification?.items?.[currentItemIndex];

  // ✅ Helper: Return photo data URL for img src (already has prefix)
  const getImageSrc = (photo) => {
    if (!photo) return null;
    // Photo now always has data URL format with prefix
    return photo;
  };

  // Handle photo from file input
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      // Keep full data URL with prefix for consistency
      const dataUrl = e.target.result;
      setPhotoData(dataUrl);
      setItemForm(prev => ({ ...prev, photo: dataUrl }));
      enqueueSnackbar('Photo ajoutée', { variant: 'success' });
    };
    reader.readAsDataURL(file);
  };

  // Capture photo from camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      enqueueSnackbar('Impossible d\'accéder à la caméra', { variant: 'error' });
    }
  };

  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      // Keep full data URL with prefix for consistency
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      setPhotoData(dataUrl);
      setItemForm(prev => ({ ...prev, photo: dataUrl }));
      stopCamera();
      enqueueSnackbar('Photo capturée', { variant: 'success' });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const removePhoto = () => {
    setPhotoData(null);
    setItemForm(prev => ({ ...prev, photo: null }));
    setPhotoCancelDialog(false);
  };

  // Save current item and move to next
  const handleSaveItem = async () => {
    if (!verification) return;

    try {
      setSaving(true);
      await verificationsAPI.updateItem(verification.id, currentItemIndex, {
        completed: itemForm.completed,
        notes: itemForm.notes,
        photo: itemForm.photo
      });

      enqueueSnackbar('Élément sauvegardé', { variant: 'success' });

      // Move to next item or show completion
      if (currentItemIndex < verification.items.length - 1) {
        const nextIndex = currentItemIndex + 1;
        const nextItem = verification.items[nextIndex];
        setCurrentItemIndex(nextIndex);
        setItemForm({
          completed: nextItem.completed || false,
          notes: nextItem.notes || nextItem.comment || '',
          photo: nextItem.photo || null
        });
        setPhotoData(nextItem.photo);
      } else {
        enqueueSnackbar('Tous les éléments ont été traités', { variant: 'info' });
      }
    } catch (error) {
      console.error('Save error:', error);
      enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePreviousItem = () => {
    if (currentItemIndex > 0) {
      const prevIndex = currentItemIndex - 1;
      const prevItem = verification.items[prevIndex];
      setCurrentItemIndex(prevIndex);
      setItemForm({
        completed: prevItem.completed || false,
        notes: prevItem.notes || prevItem.comment || '',
        photo: prevItem.photo || null
      });
      setPhotoData(prevItem.photo);
    }
  };

  const handleFinishVerification = async () => {
    try {
      setSaving(true);
      await verificationsAPI.complete(verification.id);
      enqueueSnackbar('Vérification complétée et soumise', { variant: 'success' });
      navigate('/rooms');
    } catch (error) {
      console.error('Finish error:', error);
      enqueueSnackbar('Erreur lors de la finalisation', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const progress = verification ? ((currentItemIndex + 1) / verification.items.length) * 100 : 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!verification || !currentItem) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Vérification introuvable</Typography>
      </Box>
    );
  }

  return (
    <>
      
      <Box className="ind-page" sx={{ pb: 8 }}>
        {/* Header */}
        <div className="ind-page-header">
          <div>
            <div className="ind-page-title" style={{ fontSize: '20px' }}>Vérification en cours</div>
            <div className="ind-page-subtitle" style={{ fontSize: '12px' }}>
              {room?.name || '—'} · {verification?.checklist?.name || '—'}
            </div>
          </div>
        </div>

        {/* Progress */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '12px', fontFamily: 'monospace', color: '#8a9aaa' }}>
              Progression
            </Typography>
            <Typography sx={{ fontSize: '12px', fontFamily: 'monospace', color: '#8a9aaa' }}>
              {currentItemIndex + 1} / {verification.items.length}
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 1 }} />
        </Box>

        {/* Current Item Card */}
        <Paper sx={{ mb: 3, background: '#0a0c0f', border: '1px solid #161c26', p: 3 }}>
          {/* Item Label */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '11px', fontFamily: 'monospace', color: '#ff6f00', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 1 }}>
              Point de contrôle {currentItemIndex + 1}
            </Typography>
            <Typography sx={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
              {currentItem.label}
            </Typography>
            {currentItem.required && (
              <Chip label="OBLIGATOIRE" size="small" sx={{ mt: 1, background: '#ff6f0022', color: '#ff6f00' }} />
            )}
          </Box>

          {/* Photo Section */}
          <Box sx={{ mb: 3, background: '#000', border: '2px solid #1a3a5a', borderRadius: 2, overflow: 'hidden' }}>
            {cameraActive ? (
              <Box>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }} />
                <Box sx={{ display: 'flex', gap: 1, p: 2, background: '#0a0c0f' }}>
                  <Button variant="contained" fullWidth onClick={capturePhoto} sx={{ background: '#00e676' }}>
                    Capturer
                  </Button>
                  <Button variant="outlined" fullWidth onClick={stopCamera}>
                    Annuler
                  </Button>
                </Box>
              </Box>
            ) : photoData ? (
              <Box>
                <img
                  src={getImageSrc(photoData)}
                  alt="Photo capturée"
                  style={{ width: '100%', display: 'block' }}
                  onError={(e) => { e.target.style.display='none'; }}
                />
                <Box sx={{ display: 'flex', gap: 1, p: 2, background: '#0a0c0f' }}>
                  <Button variant="outlined" fullWidth onClick={() => setPhotoCancelDialog(true)} sx={{ color: '#ef5350', borderColor: '#ef5350' }}>
                    Supprimer
                  </Button>
                  <Button variant="contained" fullWidth onClick={startCamera} sx={{ textTransform: 'none' }}>
                    📷 Reprendre
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography sx={{ color: '#3a4a5a', mb: 2 }}>Aucune photo</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={startCamera}
                    sx={{ background: '#4a90e2', textTransform: 'none' }}
                  >
                    📷 Prendre une photo
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ textTransform: 'none' }}
                  >
                    📁 Importer
                  </Button>
                </Box>
              </Box>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </Box>

          {/* Notes */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '11px', fontFamily: 'monospace', color: '#ff6f00', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 1 }}>
              Observations
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Ajouter des commentaires..."
              value={itemForm.notes}
              onChange={(e) => setItemForm(prev => ({ ...prev, notes: e.target.value }))}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: '#000',
                  color: '#fff',
                  '& fieldset': { borderColor: '#1a3a5a' }
                },
                '& .MuiOutlinedInput-input::placeholder': { color: '#3a4a5a', opacity: 1 }
              }}
            />
          </Box>

          {/* Completion Checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={itemForm.completed}
                onChange={(e) => setItemForm(prev => ({ ...prev, completed: e.target.checked }))}
              />
            }
            label={<Typography sx={{ color: '#fff' }}>Élément conforme</Typography>}
            sx={{ mb: 2 }}
          />
        </Paper>

        {/* Navigation */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handlePreviousItem}
            disabled={currentItemIndex === 0 || saving}
            sx={{ textTransform: 'none' }}
          >
            Précédent
          </Button>
          <Button
            fullWidth
            variant="contained"
            endIcon={currentItemIndex === verification.items.length - 1 ? undefined : <ArrowForward />}
            onClick={handleSaveItem}
            disabled={saving}
            sx={{ background: '#4a90e2' }}
          >
            {saving ? <CircularProgress size={20} /> : currentItemIndex === verification.items.length - 1 ? 'Terminer la vérification' : 'Suivant'}
          </Button>
        </Box>

        {/* Cancel Photo Dialog */}
        <Dialog open={photoCancelDialog} onClose={() => setPhotoCancelDialog(false)}>
          <DialogTitle>Supprimer la photo ?</DialogTitle>
          <DialogContent>
            <Typography>Êtes-vous sûr de vouloir supprimer cette photo ?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPhotoCancelDialog(false)}>Non</Button>
            <Button onClick={removePhoto} color="error" variant="contained">Supprimer</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
