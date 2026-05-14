import './RoomAIAnalysis.css';
import React, { useState } from 'react';
import { aiAPI } from '../../services/api';

const RoomAIAnalysis = ({ roomId, className = '' }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeRoom = async () => {
    if (!roomId) {
      setError('ID de salle manquant');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await aiAPI.analyzeRoomRisk(roomId);
      setAnalysis(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'analyse IA');
      console.error('AI Analysis Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'Normal': return 'text-green-600 bg-green-100 border-green-300';
      case 'Attention': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      case 'Anormal': return 'text-red-600 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getStateIcon = (state) => {
    switch (state) {
      case 'Normal': return '✅';
      case 'Attention': return '⚠️';
      case 'Anormal': return '🚨';
      default: return '❓';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critique': return 'bg-red-500 text-white';
      case 'Haute': return 'bg-orange-500 text-white';
      case 'Moyenne': return 'bg-yellow-500 text-black';
      case 'Faible': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRiskBarColor = (risk) => {
    if (risk >= 50) return 'bg-red-500';
    if (risk >= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'hausse': return '📈';
      case 'baisse': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Analyse IA</h3>
            <p className="text-xs text-gray-500">Évaluation automatique par intelligence artificielle</p>
          </div>
        </div>
        <button
          onClick={analyzeRoom}
          disabled={loading}
          className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
            loading 
              ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              Analyse en cours...
            </>
          ) : (
            <>
              <span>🔍</span>
              Analyser
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <span className="text-lg">❌</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="p-4 space-y-4">
          {/* Main State */}
          <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${getStateColor(analysis.state)}`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getStateIcon(analysis.state)}</span>
              <div>
                <div className="text-xl font-bold">{analysis.state}</div>
                <div className="text-sm opacity-75">État de la salle</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{analysis.risk}%</div>
              <div className="text-sm opacity-75">Score de risque</div>
            </div>
          </div>

          {/* Risk Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Niveau de risque</span>
              <span>{analysis.risk}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ${getRiskBarColor(analysis.risk)}`}
                style={{ width: `${Math.min(100, analysis.risk)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>0% (OK)</span>
              <span>50%</span>
              <span>100% (Critique)</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <span>📊</span>
                <span>Problèmes</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 mt-1">
                {analysis.issues}/{analysis.total}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <span>{getTrendIcon(analysis.trend)}</span>
                <span>Tendance</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 mt-1 capitalize">
                {analysis.trend}
              </div>
            </div>
          </div>

          {/* Alerts */}
          {analysis.alerts && analysis.alerts.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                <span>⚠️</span>
                Alertes détectées ({analysis.alerts.length})
              </h4>
              <ul className="space-y-2">
                {analysis.alerts.slice(0, 5).map((alert, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-600">
                    <span className="mt-0.5">•</span>
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
              {analysis.alerts.length > 5 && (
                <div className="mt-2 text-xs text-red-500">
                  +{analysis.alerts.length - 5} autres alertes...
                </div>
              )}
            </div>
          )}

          {/* Maintenance Recommendation */}
          {analysis.maintenance && (
            <div className={`p-4 rounded-lg ${getPriorityColor(analysis.maintenance.priority)}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔧</span>
                <span className="font-bold">Priorité: {analysis.maintenance.priority}</span>
              </div>
              <div className="font-medium">{analysis.maintenance.action}</div>
              <div className="text-sm opacity-90 mt-1">{analysis.maintenance.details}</div>
            </div>
          )}

          {/* Source Info */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span>ℹ️</span>
              <span>{analysis.note}</span>
            </div>
            {analysis.source && (
              <span className="bg-gray-100 px-2 py-1 rounded">
                Source: {analysis.source}
              </span>
            )}
          </div>

          {/* Reason */}
          {analysis.reason && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2 text-sm text-blue-700">
                <span>💡</span>
                <span>{analysis.reason}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!analysis && !loading && !error && (
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🤖</span>
          </div>
          <p className="text-gray-500 mb-2">
            Cliquez sur "Analyser" pour évaluer automatiquement l'état de la salle
          </p>
          <p className="text-xs text-gray-400">
            L'IA analysera les commentaires des techniciens pour déterminer le niveau de risque
          </p>
        </div>
      )}
    </div>
  );
};

export default RoomAIAnalysis;
