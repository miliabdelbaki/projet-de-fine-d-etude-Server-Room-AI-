import './DashboardPage.css';
import React, { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';

import { statsAPI } from '../../services/api';
import TechniciansChart from '../../components/TechniciansChart/TechniciansChart';



const getWeekDays = () => {
  const days = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const weekDays = [];
  for (let i = 1; i <= 7; i++) {
    const dayIndex = (currentDay + i) % 7;
    weekDays.push(days[dayIndex]);
  }
  return weekDays;
};

const WEEK_DAYS = getWeekDays();

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalRooms: 0, totalVerifications: 0 });
  const [bars, setBars] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [activity, setActivity] = useState([]);
  const [sysItems, setSysItems] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadData({ silent: false });
    const interval = setInterval(() => loadData({ silent: true }), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async ({ silent } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await statsAPI.getDashboardStats();
      setStats({
        totalUsers: data.totalUsers,
        totalRooms: data.totalRooms,
        totalVerifications: data.totalVerifications
      });
      setBars(Array.isArray(data.weeklyVerifications) ? data.weeklyVerifications : [0, 0, 0, 0, 0, 0, 0]);
      setActivity(Array.isArray(data.activity) ? data.activity : []);
      setSysItems(Array.isArray(data.systemStatus) ? data.systemStatus : []);
    } catch (err) {
      if (!silent) {
        const hint =
          err?.code === 'ERR_NETWORK' || err?.message === 'Network Error'
            ? ' Impossible de joindre l’API (démarrez le backend ou définissez REACT_APP_API_URL).'
            : '';
        enqueueSnackbar(`Erreur de chargement du tableau de bord.${hint}`, { variant: 'error' });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ✅ Helper: Ensure photo URL has proper data URL prefix
  const getPhotoSrc = (photo) => {
    if (!photo || photo.length === 0) return null;
    if (photo.startsWith('data:')) return photo;
    return `data:image/jpeg;base64,${photo}`;
  };

  if (loading) {
    return (
      <>
                <div className="db-loader">
          <div className="loader-ring" />
          <span className="loader-text">Chargement du tableau de bord…</span>
        </div>
      </>
    );
  }

  const now = new Date();

  const STAT_CARDS = [
    { label: 'Utilisateurs enregistrés', value: stats.totalUsers, unit: 'Comptes actifs', accent: '#ff6f00', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z', trend: '+2 ce mois' },
    { label: 'Salles surveillées', value: stats.totalRooms, unit: 'Salles serveurs', accent: '#00b4d8', icon: 'M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z', trend: 'Actives' },
    { label: 'Vérifications totales', value: stats.totalVerifications, unit: 'Contrôles effectués', accent: '#00e676', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', trend: 'Cette semaine' },
  ];

  const ACTIVITY = activity.length > 0
    ? activity.map((item) => ({
      ...item,
      color: item.status === 'validated' ? '#00e676' : item.status === 'incomplete' ? '#e53935' : '#ff6f00',
      time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '---'
    }))
    : [
      { text: <>Aucune activité récente.</>, time: '—', color: '#3a4a5a' }
    ];

  const SYS_ITEMS = [];

  return (
    <>
            <div className="db-root">
        <div className="db-header">
          <div>
            <div className="db-title">Tableau de bord</div>
            <div className="db-subtitle">// Vue d'ensemble opérationnelle</div>
          </div>
          <div className="db-timestamp">
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#3a4a5a' }}>
              {now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="stats-grid">
          {STAT_CARDS.map((c) => (
            <div className="stat-card" key={c.label} style={{ '--accent': c.accent }}>
              <div className="stat-label">{c.label}</div>
              <div className="stat-value">{c.value}</div>
              <div className="stat-unit">{c.unit}</div>
              <div className="stat-trend">{c.trend}</div>
              <svg className="stat-card-bg" width="80" height="80" viewBox="0 0 24 24" fill={c.accent}>
                <path d={c.icon} />
              </svg>
            </div>
          ))}
        </div>

        <div className="db-two-col">
          {/* ACTIVITÉ RÉCENTE */}
          <div className="db-section">
            <div className="db-section-header">
              <span className="db-section-title">Activité récente</span>
              <span className="section-tag">Live</span>
            </div>
            <div className="activity-list">
              {ACTIVITY.map((a, i) => (
                <div 
                  className="activity-item activity-item-clickable" 
                  key={i}
                  onClick={() => setSelectedActivity(a)}
                  title="Cliquez pour voir les détails et les images"
                >
                  <div className="activity-dot" style={{ '--dot-color': a.color }} />
                  <div className="activity-text">{a.text}</div>
                  <div className="activity-time">{a.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* STATUT DES TECHNICIENS */}
          <TechniciansChart />
        </div>

        {/* VÉRIFICATIONS HEBDO */}
        <div className="db-section">
          <div className="db-section-header">
            <span className="db-section-title">Vérifications cette semaine</span>
            <span className="section-tag">Semaine en cours</span>
          </div>
          <div className="mini-chart">
            {(() => {
              const maxValue = Math.max(...bars, 1); // Ensure at least 1 to avoid division by 0
              return bars.map((h, i) => {
                const heightPercent = (h / maxValue) * 100;
                return (
                  <div
                    key={i}
                    className="chart-bar"
                    style={{ height: `${heightPercent}%` }}
                    title={`${WEEK_DAYS[i]}: ${h} vérification${h !== 1 ? 's' : ''}`}
                  />
                );
              });
            })()}
          </div>
          <div className="chart-labels">
            {WEEK_DAYS.map((d) => (
              <span className="chart-label" key={d}>{d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL: Détails d'activité avec images */}
      {selectedActivity && (
        <div className="modal-overlay" onClick={() => setSelectedActivity(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Détails de l'activité</div>
              <button className="modal-close" onClick={() => setSelectedActivity(null)}>✕</button>
            </div>

            <div className="activity-details">
              <div className="detail-row">
                <span className="detail-label">Salle</span>
                <span className="detail-value">{selectedActivity.room}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Technicien</span>
                <span className="detail-value">{selectedActivity.technician}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Statut</span>
                <span className="detail-value">
                  <span style={{
                    color: selectedActivity.status === 'validated' ? '#00e676' : 
                           selectedActivity.status === 'incomplete' ? '#e53935' : '#ff6f00'
                  }}>
                    {selectedActivity.status}
                  </span>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date</span>
                <span className="detail-value">
                  {new Date(selectedActivity.createdAt).toLocaleString('fr-FR')}
                </span>
              </div>
            </div>

            {/* Afficher les items avec images et notes */}
            {selectedActivity.items && selectedActivity.items.length > 0 && (
              <div className="items-container">
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#fff',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span style={{ width: 3, height: 16, background: '#ff6f00' }} />
                  Éléments vérifiés
                </div>

                {selectedActivity.items.map((item, idx) => {
                  const photoSrc = getPhotoSrc(item.photo);
                  return (
                    <div className="item-block" key={idx}>
                      <div className="item-label">{item.label}</div>
                      <span className={`item-status ${item.completed ? 'completed' : 'incomplete'}`}>
                        {item.completed ? '✓ COMPLÉTÉ' : '✗ NON COMPLÉTÉ'}
                      </span>

                      {item.notes && (
                        <div className="item-notes">
                          <strong>Notes :</strong> {item.notes}
                        </div>
                      )}

                      {photoSrc ? (
                        <img 
                          src={photoSrc}
                          alt={`Photo - ${item.label}`}
                          className="item-image"
                          onLoad={() => {
                            console.log('✅ Image loaded successfully for:', item.label);
                          }}
                          onError={(e) => {
                            console.error('❌ Image load error for:', item.label);
                            console.error('Photo src starts with:', photoSrc?.substring(0, 80));
                            console.error('Photo length:', photoSrc?.length);
                            e.target.style.display = 'none';
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'image-error';
                            errorDiv.textContent = '❌ Erreur lors du chargement de l\'image';
                            e.target.parentElement.appendChild(errorDiv);
                          }}
                        />
                      ) : (
                        <div className="no-image">📷 Aucune image capturée</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
