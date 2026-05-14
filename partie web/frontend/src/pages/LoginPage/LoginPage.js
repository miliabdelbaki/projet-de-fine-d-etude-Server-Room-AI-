import './LoginPage.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { authAPI } from '../../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.login(email, password);
      enqueueSnackbar('Authentification réussie', { variant: 'success' });
      navigate('/dashboard');
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.message || 'Identifiants invalides.',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      

      <div className="login-root">
        {/* LEFT PANEL */}
        <div className="login-left">
          <div className="grid-lines" />
          <div className="scan-line" />

          {/* SVG server rack art */}
          <svg className="server-art" width="400" height="500" viewBox="0 0 400 500" fill="none">
            {[0,1,2,3,4,5,6,7].map(i => (
              <g key={i} transform={`translate(40, ${60 + i*52})`}>
                <rect width="320" height="40" rx="2" fill="#ffffff" />
                <rect x="4" y="4" width="40" height="32" rx="1" fill="#cccccc" />
                <circle cx="60" cy="20" r="4" fill="#888888" />
                <circle cx="75" cy="20" r="4" fill="#888888" />
                <rect x="90" y="8" width="180" height="4" rx="1" fill="#bbbbbb" />
                <rect x="90" y="16" width="140" height="4" rx="1" fill="#bbbbbb" />
                <rect x="90" y="24" width="160" height="4" rx="1" fill="#bbbbbb" />
                <circle cx="296" cy="14" r="3" fill="#cccccc" />
                <circle cx="296" cy="26" r="3" fill="#cccccc" />
                <circle cx="308" cy="14" r="3" fill="#cccccc" />
                <circle cx="308" cy="26" r="3" fill="#cccccc" />
              </g>
            ))}
            <rect x="40" y="50" width="320" height="450" rx="2" fill="none" stroke="#ffffff" strokeWidth="1" />
          </svg>

          <div className="left-content">
            <div className="left-tag">Système de surveillance</div>
            <h1 className="left-heading">
              Server<br />
              <span>Room</span>
              Guardian
            </h1>
            <p className="left-desc">
              Plateforme industrielle de monitoring, vérification et analyse de risque pour salles serveurs critiques.
            </p>


          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="login-right">
          <div className={`form-container ${mounted ? 'mounted' : ''}`}>
            <div className="form-logo">
              <div className="logo-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 2L20 7V15L11 20L2 15V7L11 2Z" fill="white" />
                  <path d="M11 6L16 9V13L11 16L6 13V9L11 6Z" fill="#ff6f00" />
                </svg>
              </div>
              <div>
                <div className="logo-text">ServerRoom Guardian</div>
                
              </div>
            </div>

            <div className="form-title">Accès Sécurisé</div>
            

            <form onSubmit={handleSubmit}>
              <div className="field-group">
                <label className="field-label">Identifiant opérateur</label>
                <div className="field-wrap">
                  <input
                    className="field-input"
                    type="email"
                    placeholder="operateur@entreprise.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </span>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Code d'accès</label>
                <div className="field-wrap">
                  <input
                    className="field-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <span className="field-icon" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </span>
                </div>
              </div>

              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? (
                  <><span className="loader" />Authentification...</>
                ) : (
                  'Accéder au système'
                )}
              </button>
            </form>

            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">sys.v1.0.0</span>
              <div className="divider-line" />
            </div>

            <div className="sys-info">
              <div className="sys-item">
                <span className="sys-key">Connexion</span>
                <span className="sys-val live">Sécurisée TLS</span>
              </div>
              <div className="sys-item">
                <span className="sys-key">Protocole</span>
                <span className="sys-val">HTTPS/2</span>
              </div>
              <div className="sys-item">
                <span className="sys-key">Région</span>
                <span className="sys-val">EU-WEST</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
