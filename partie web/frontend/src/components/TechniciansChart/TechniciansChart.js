import React, { useState, useEffect } from 'react';
import { statsAPI } from '../../services/api';
import './TechniciansChart.css';

export default function TechniciansChart() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTechs, setSelectedTechs] = useState([]); // State for filtering

  useEffect(() => {
    loadTechniciansStats({ initial: true });
    const interval = setInterval(() => loadTechniciansStats({ initial: false }), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTechniciansStats = async ({ initial } = { initial: true }) => {
    try {
      if (initial) setLoading(true);
      const data = await statsAPI.getTechniciansStats();
      
      console.log('📊 Données reçues du backend:', data);
      
      // Ensure data is an array
      const statsArray = Array.isArray(data) ? data : [];
      
      // Filter technicians with at least one verification or intervention
      const filtered = statsArray.filter(tech => 
        (tech.totalVerifications && tech.totalVerifications > 0) || 
        (tech.totalInterventions && tech.totalInterventions > 0)
      );
      
      console.log('🔧 Techniciens filtrés:', filtered.length);
      
      setTechnicians(filtered);
      // Set first technician as default
      if (filtered.length > 0) {
        setSelectedTechs([filtered[0].id.toString()]);
      }
      setError(null);
    } catch (err) {
      console.error('❌ Erreur loading technicians stats:', err);
      if (initial) {
        const net =
          err?.code === 'ERR_NETWORK' || err?.message === 'Network Error'
            ? 'réseau (vérifiez que l’API tourne sur le port du backend ou le proxy CRA /api).'
            : (err.message || 'erreur inconnue');
        setError(`Erreur de chargement : ${net}`);
        setTechnicians([]);
      }
    } finally {
      if (initial) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="tech-chart-root">
        <div className="tech-chart-container">
          <div className="tech-chart-header">
            <span className="tech-chart-title">Statut des techniciens</span>
            <span className="tech-chart-tag">Live</span>
          </div>
          <div className="tech-chart-loading">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  border: '2px solid #1e2a38',
                  borderTopColor: '#00b4d8',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
              <span>Chargement...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tech-chart-root">
        <div className="tech-chart-container">
          <div className="tech-chart-header">
            <span className="tech-chart-title">Statut des techniciens</span>
          </div>
          <div className="tech-chart-error">
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ color: '#e53935', marginBottom: '12px' }}>{error}</div>
              <button 
                onClick={() => loadTechniciansStats({ initial: true })}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#00b4d8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="tech-chart-root">
        <div className="tech-chart-container">
          <div className="tech-chart-header">
            <span className="tech-chart-title">Statut des techniciens</span>
            <span className="tech-chart-tag">Live</span>
          </div>
          <div className="tech-chart-loading">
            <div style={{ 
              padding: '20px',
              textAlign: 'center',
              color: '#8a9aaa'
            }}>
              <div style={{ marginBottom: '12px' }}>Aucun technicien avec interventions</div>
              <div style={{ fontSize: '11px', color: '#5a6a7a', marginBottom: '12px' }}>
                Les techniciens et leurs interventions s'afficheront ici
              </div>
              <button 
                onClick={() => loadTechniciansStats({ initial: true })}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#00b4d8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fonction pour filtrer les techniciens affichés
  const toggleTechFilter = (techId) => {
    setSelectedTechs(prev => {
      if (prev.includes(techId)) {
        // Ne permet pas de désélectionner si c'est le dernier
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter(id => id !== techId);
      } else {
        return [...prev, techId];
      }
    });
  };

  // Get filtered list
  const displayedTechs = technicians.filter(t => selectedTechs.includes(t.id.toString()));

  return (
    <div className="tech-chart-root">
      <div className="tech-chart-container">
        <div className="tech-chart-header">
          <span className="tech-chart-title">Statut des techniciens</span>
          <span className="tech-chart-tag">Live</span>
        </div>

        {/* FILTER SECTION */}
        <div className="tech-filter-section">
          <div className="tech-filter-label">Filtrer par technicien pour décider qui fait la maintenance</div>
          <div className="tech-filter-list">
            {technicians.map((tech) => (
              <button
                key={tech.id}
                className={`tech-filter-btn ${selectedTechs.includes(tech.id.toString()) ? 'active' : ''}`}
                onClick={() => toggleTechFilter(tech.id.toString())}
              >
                {tech.name}
              </button>
            ))}
          </div>
        </div>

        <div className="tech-chart-content">
          <ul className="tech-list">
            {displayedTechs.map((tech) => {
                const totalVeri = tech.totalVerifications || 0;
                const totalInter = tech.totalInterventions || 0;
                
                const maxValueVeri = Math.max(
                  tech.submitted || 0,
                  tech.validated || 0,
                  tech.completed || 0,
                  tech.incomplete || 0,
                  tech.draft || 0,
                  1
                );
                
                const maxValueInter = Math.max(
                  tech.enAttente || 0,
                  tech.enCours || 0,
                  tech.terminee || 0,
                  1
                );

                return (
                  <li key={tech.id} className="tech-list-item">
                    <div className="tech-info-row">
                      <span className="tech-name">{tech.name}</span>
                      <span className={`tech-status ${tech.isApproved ? 'approved' : 'pending'}`}>
                        {tech.isApproved ? '✓ Approuvé' : '⏳ En attente'}
                      </span>
                    </div>

                    {/* SECTION INTERVENTIONS DE MAINTENANCE */}
                    {totalInter > 0 && (
                      <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #1e2a38' }}>
                        <div style={{
                          fontSize: 11,
                          color: '#8a9aaa',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 600,
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <span style={{ 
                            width: 2, 
                            height: 12, 
                            background: '#00b4d8',
                            borderRadius: 1
                          }} />
                          Interventions de maintenance
                        </div>
                        <div className="tech-stats-container">
                          {/* En attente (Jaune) */}
                          {tech.enAttente > 0 && (
                            <div className="tech-stat-box">
                              <div className="tech-stat-label">En attente</div>
                              <div className="tech-stat-value tech-stat-enattente">
                                {tech.enAttente}
                              </div>
                              <div className="tech-stat-bar">
                                <div
                                  className="tech-stat-bar-fill"
                                  style={{
                                    backgroundColor: '#ffc107',
                                    width: `${(tech.enAttente / maxValueInter) * 100}%`
                                  }}
                                  />
                              </div>
                            </div>
                          )}

                          {/* En cours (Cyan) */}
                          {tech.enCours > 0 && (
                            <div className="tech-stat-box">
                              <div className="tech-stat-label">En cours</div>
                              <div className="tech-stat-value tech-stat-encours">
                                {tech.enCours}
                              </div>
                              <div className="tech-stat-bar">
                                <div
                                  className="tech-stat-bar-fill"
                                  style={{
                                    backgroundColor: '#00b4d8',
                                    width: `${(tech.enCours / maxValueInter) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Terminée (Vert) */}
                          {tech.terminee > 0 && (
                            <div className="tech-stat-box">
                              <div className="tech-stat-label">Terminée</div>
                              <div className="tech-stat-value tech-stat-terminee">
                                {tech.terminee}
                              </div>
                              <div className="tech-stat-bar">
                                <div
                                  className="tech-stat-bar-fill"
                                  style={{
                                    backgroundColor: '#00e676',
                                    width: `${(tech.terminee / maxValueInter) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Total interventions */}
                          <div className="tech-stat-box" style={{ backgroundColor: 'rgba(0, 180, 216, 0.1)' }}>
                            <div className="tech-stat-label">Total</div>
                            <div className="tech-stat-value" style={{ color: '#00b4d8' }}>
                              {totalInter}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION VERIFICATIONS */}
                    {totalVeri > 0 && (
                      <div>
                        <div style={{
                          fontSize: 11,
                          color: '#8a9aaa',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 600,
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <span style={{ 
                            width: 2, 
                            height: 12, 
                            background: '#ff6f00',
                            borderRadius: 1
                          }} />
                          Vérifications
                        </div>
                        <div className="tech-stats-container">
                          {/* Soumise (Orange) */}
                          {tech.submitted > 0 && (
                            <div className="tech-stat-box">
                              <div className="tech-stat-label">Soumise</div>
                              <div className="tech-stat-value tech-stat-submitted">
                                {tech.submitted}
                              </div>
                              <div className="tech-stat-bar">
                                <div
                                  className="tech-stat-bar-fill"
                                  style={{
                                    backgroundColor: '#ff6f00',
                                    width: `${(tech.submitted / maxValueVeri) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Validée (Cyan) */}
                          {tech.validated > 0 && (
                            <div className="tech-stat-box">
                              <div className="tech-stat-label">Validée</div>
                              <div className="tech-stat-value tech-stat-validated">
                                {tech.validated}
                              </div>
                              <div className="tech-stat-bar">
                                <div
                                  className="tech-stat-bar-fill"
                                  style={{
                                    backgroundColor: '#00b4d8',
                                    width: `${(tech.validated / maxValueVeri) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Terminée (Vert) */}
                          {tech.completed > 0 && (
                            <div className="tech-stat-box">
                              <div className="tech-stat-label">Terminée</div>
                              <div className="tech-stat-value tech-stat-completed">
                                {tech.completed}
                              </div>
                              <div className="tech-stat-bar">
                                <div
                                  className="tech-stat-bar-fill"
                                  style={{
                                    backgroundColor: '#00e676',
                                    width: `${(tech.completed / maxValueVeri) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Incomplète (Rouge) */}
                          {tech.incomplete > 0 && (
                            <div className="tech-stat-box">
                              <div className="tech-stat-label">Incomplète</div>
                              <div className="tech-stat-value tech-stat-incomplete">
                                {tech.incomplete}
                              </div>
                              <div className="tech-stat-bar">
                                <div
                                  className="tech-stat-bar-fill"
                                  style={{
                                    backgroundColor: '#e53935',
                                    width: `${(tech.incomplete / maxValueVeri) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Brouillon (Bleu ciel) */}
                          {tech.draft > 0 && (
                            <div className="tech-stat-box">
                              <div className="tech-stat-label">Brouillon</div>
                              <div className="tech-stat-value tech-stat-draft">
                                {tech.draft}
                              </div>
                              <div className="tech-stat-bar">
                                <div
                                  className="tech-stat-bar-fill"
                                  style={{
                                    backgroundColor: '#00b4d8',
                                    width: `${(tech.draft / maxValueVeri) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Total vérifications */}
                          <div className="tech-stat-box" style={{ backgroundColor: 'rgba(255, 111, 0, 0.1)' }}>
                            <div className="tech-stat-label">Total</div>
                            <div className="tech-stat-value" style={{ color: '#ff6f00' }}>
                              {totalVeri}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  }
