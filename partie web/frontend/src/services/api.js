import axios from 'axios';

/**
 * Base API (`.../api`). En dev sans `REACT_APP_API_URL`, on utilise `/api` pour passer par le
 * proxy CRA (`package.json` → `http://127.0.0.1:5000`).
 *
 * Important Axios : avec baseURL `/api`, un chemin qui commence par `/` (ex. `/admin/stats`) est
 * résolu depuis la racine du site → `/admin/stats` (404). D’où baseURL avec slash final et chemins
 * relatifs sans `/` initial.
 */
function resolveApiBase() {
  const fromEnv = (process.env.REACT_APP_API_URL || '').trim();
  if (fromEnv) {
    const root = fromEnv.replace(/\/$/, '');
    return root.endsWith('/api') ? root : `${root}/api`;
  }
  return 'http://127.0.0.1:5000/api';
}

/** Préfixe pour `fetch` : sans slash final (`${API_BASE}/ai/...`). */
export const API_BASE = resolveApiBase().replace(/\/+$/, '');

const axiosBaseURL = `${API_BASE}/`;

const api = axios.create({ baseURL: axiosBaseURL, headers: { 'Content-Type': 'application/json' } });

if (process.env.NODE_ENV !== 'production') {
  console.debug('API base (fetch):', API_BASE, '| axios baseURL:', axiosBaseURL);
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      authAPI.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const usersAPI = {
  getAll: async () => {
    const response = await api.get('admin/users');
    return response.data.map((user) => ({
      ...user,
      id: user._id,
      full_name: user.displayName,
      status: user.approved ? 'active' : 'pending',
    }));
  },
  getPending: async () => {
    const response = await api.get('admin/users');
    return response.data
      .filter((user) => user.approved === false)
      .map((user) => ({
        ...user,
        id: user._id,
        full_name: user.displayName,
        status: 'pending',
      }));
  },
  approve: async (id, approved = true) => {
    const response = await api.put(`admin/users/${id}/approve`, { approved });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`admin/users/${id}`);
    return response.data;
  },
};

export const roomsAPI = {
  getAll: async () => {
    const response = await api.get('rooms');
    return response.data.map((room) => ({ ...room, id: room._id }));
  },
  create: async (roomData) => {
    const response = await api.post('rooms', roomData);
    return response.data;
  },
  update: async (id, roomData) => {
    const response = await api.put(`rooms/${id}`, roomData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`rooms/${id}`);
    return response.data;
  },
};

export const checklistsAPI = {
  getAll: async () => {
    const response = await api.get('checklists');
    return response.data.map((c) => ({ ...c, id: c._id }));
  },
  create: async (data) => {
    const response = await api.post('checklists', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`checklists/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`checklists/${id}`);
    return response.data;
  },
};

export const verificationsAPI = {
  getAll: async () => {
    const response = await api.get('verifications');
    const data = response.data;
    if (!Array.isArray(data)) {
      console.warn('verificationsAPI.getAll: unexpected response', data);
      return [];
    }
    return data.map((v) => ({ ...v, id: v._id }));
  },
  getByRoom: async (roomId) => {
    const response = await api.get(`verifications/rooms/${roomId}/verifications`);
    const data = response.data;
    if (!Array.isArray(data)) {
      console.warn('verificationsAPI.getByRoom: unexpected response', data);
      return [];
    }
    return data.map((v) => ({ ...v, id: v._id }));
  },
  startForRoom: async (roomId) => {
    const response = await api.post(`verifications/rooms/${roomId}/start-verification`);
    return response.data;
  },
  updateItem: async (verificationId, itemIndex, itemData) => {
    const response = await api.put(`verifications/${verificationId}/items/${itemIndex}`, itemData);
    return response.data;
  },
  complete: async (verificationId) => {
    const response = await api.put(`verifications/${verificationId}/submit`);
    return response.data;
  },
};

export const statsAPI = {
  getDashboardStats: async () => {
    const response = await api.get('admin/stats');
    return response.data;
  },
  getTechniciansStats: async () => {
    const response = await api.get('admin/technicians-stats');
    return response.data;
  },
};

export const aiAPI = {
  analyzeRoomRisk: async (roomId) => {
    const response = await api.post('ai/room-risk', { roomId });
    return response.data;
  },
  predictRisk: async (roomId) => {
    const response = await api.post('ai/room-risk-predict', { roomId });
    return response.data;
  },
  getMaintenanceNotes: async (roomId) => {
    const response = await api.get(`ai/maintenance-notes/${roomId}`);
    return response.data;
  },
  saveMaintenanceNote: async (data) => {
    const response = await api.post('ai/maintenance-note', data);
    return response.data;
  },
  getMyMaintenanceNotifications: async () => {
    const response = await api.get('ai/maintenance-notifications/me');
    return response.data;
  },
  updateMaintenanceStatus: async (noteId, data) => {
    const response = await api.patch(`ai/maintenance-note/${noteId}/status`, data);
    return response.data;
  },
};

export default api;
